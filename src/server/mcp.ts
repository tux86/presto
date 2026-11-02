import { writeFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";
import { reportGrid } from "../core/grid.ts";
import { revenue, totalDays } from "../core/totals.ts";
import { type Client, type Company, lookupFrom, type Mission, type Report } from "../core/types.ts";
import { config } from "./config.ts";

/**
 * A Model Context Protocol server, small enough to carry by hand: tools only,
 * stateless, JSON in and JSON out. The same handler serves `POST /mcp` and the
 * stdio entry point.
 *
 * Every tool goes through the REST API in-process, so the rules that protect a
 * report (completed is frozen, PDFs only for completed reports, month length)
 * live in one place: the routes.
 */

/** Calls the REST API without a network hop: `app.request` bound to an app. */
export type ApiFetch = (path: string, init?: RequestInit) => Response | Promise<Response>;

export interface McpOptions {
  /** Only the stdio server may write files: over HTTP the disk is the server's, not the caller's. */
  canWriteFiles: boolean;
}

const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `Presto produces monthly activity reports (CRA) for a freelancer.
Model: a company (the freelancer's legal entity) bills clients; a mission belongs to one client and has a daily rate; a report is one mission for one month.
A day is worth 0, 0.5 or 1. Weekends and public holidays (from the client's country) are computed; billing one is allowed but unusual — confirm with the user first.
A completed report is frozen: revert it to draft before changing days or the client note. A PDF can only be exported from a completed report.
"note" is printed on the PDF the client receives; "privateNote" never leaves this machine. Never put private information in "note".
Amounts are per currency and never converted. Start with get_overview to learn the ids.`;

class ToolError extends Error {}

async function call<T>(api: ApiFetch, method: string, path: string, body?: unknown): Promise<T> {
  const res = await api(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ToolError(error.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** A report as an agent wants to read it: named, totalled, no ids to resolve. */
function summarize(report: Report, missions: Mission[], clients: Client[]) {
  const mission = missions.find((m) => m.id === report.missionId);
  const client = clients.find((c) => c.id === mission?.clientId);
  const days = totalDays(report.days);
  return {
    id: report.id,
    month: `${report.year}-${String(report.month).padStart(2, "0")}`,
    mission: mission?.name,
    client: client?.name,
    status: report.status,
    days,
    // The report's snapshot, else the mission's rate: what the UI, CSV and summary use.
    amount: revenue(days, report.dailyRate ?? mission?.dailyRate),
    currency: client?.currency,
  };
}

const id = (what: string) => z.string().min(1).describe(`${what} id, from get_overview`);
const year = z.number().int().min(2000).max(2100);
const month = z.number().int().min(1).max(12);
const locale = z.enum(["en", "fr"]).default("en").describe("Language of the document");

type Content = { type: "text"; text: string } | { type: "resource"; resource: Record<string, string> };

interface Tool<S extends z.ZodType = z.ZodType> {
  description: string;
  input: S;
  readOnly?: boolean;
  run: (args: z.infer<S>, api: ApiFetch, options: McpOptions) => Promise<unknown>;
}

const tool = <S extends z.ZodType>(t: Tool<S>) => t as unknown as Tool;

const TOOLS: Record<string, Tool> = {
  get_overview: tool({
    description:
      "Companies, clients, missions and the reports of a year with their totals. Call this first to find ids.",
    input: z.object({ year: year.optional().describe("Defaults to the current year") }),
    readOnly: true,
    run: async ({ year }, api) => {
      const state = await call<{ companies: Company[]; clients: Client[]; missions: Mission[]; reports: Report[] }>(
        api,
        "GET",
        "/state",
      );
      const wanted = year ?? new Date().getUTCFullYear();
      return {
        today: new Date().toISOString().slice(0, 10),
        companies: state.companies,
        clients: state.clients,
        missions: state.missions,
        reports: state.reports.filter((r) => r.year === wanted).map((r) => summarize(r, state.missions, state.clients)),
      };
    },
  }),

  get_report: tool({
    description: "One report, day by day: weekday, weekend, public holiday, value and note for every day.",
    input: z.object({ reportId: id("Report") }),
    readOnly: true,
    run: async ({ reportId }, api) => {
      const ctx = await call<
        { report: Report; mission: Mission; client: Client; company: Company } & {
          holidays: Record<string, string>;
        }
      >(api, "GET", `/reports/${reportId}`);
      const { report } = ctx;
      return {
        ...summarize(report, [ctx.mission], [ctx.client]),
        company: ctx.company.name,
        dailyRate: report.dailyRate ?? ctx.mission.dailyRate,
        note: report.note,
        privateNote: report.privateNote,
        calendar: reportGrid(report, lookupFrom(ctx.holidays)).map((d) => ({
          day: d.day,
          date: d.iso,
          weekday: d.label,
          ...(d.isWeekend && { weekend: true }),
          ...(d.holiday && { holiday: d.holiday }),
          value: d.value,
          ...(d.note && { note: d.note }),
        })),
      };
    },
  }),

  create_report: tool({
    description: "Create an empty draft report for a mission and a month.",
    input: z.object({ missionId: id("Mission"), year, month }),
    run: (args, api) => call(api, "POST", "/reports", args),
  }),

  fill_report: tool({
    description:
      "Fill a draft report: 'workdays' marks every weekday that is not a public holiday as a full day; 'previous_month' repeats last month's weekday pattern. Replaces the days already set.",
    input: z.object({ reportId: id("Report"), from: z.enum(["workdays", "previous_month"]) }),
    run: ({ reportId, from }, api) =>
      call(api, "POST", `/reports/${reportId}/${from === "workdays" ? "fill" : "copy-previous"}`),
  }),

  update_report: tool({
    description:
      "Change a report. 'days' and 'dayNotes' are merged into what is there: only the days you name change, a value of 0 or an empty note removes one. Set status to 'completed' when the month is final, 'draft' to edit a completed one.",
    input: z.object({
      reportId: id("Report"),
      days: z
        .record(z.string(), z.union([z.literal(0), z.literal(0.5), z.literal(1)]))
        .optional()
        .describe('Day of month to value, e.g. {"14": 0, "15": 0.5}'),
      dayNotes: z.record(z.string(), z.string()).optional().describe('Day of month to note, e.g. {"3": "On site"}'),
      note: z.string().nullable().optional().describe("Printed on the client's PDF"),
      privateNote: z.string().nullable().optional().describe("Never leaves this machine"),
      status: z.enum(["draft", "completed"]).optional(),
    }),
    run: async ({ reportId, days, dayNotes, ...rest }, api) => {
      const patch: Record<string, unknown> = { ...rest };
      if (days || dayNotes) {
        const { report } = await call<{ report: Report }>(api, "GET", `/reports/${reportId}`);
        if (days) patch.days = { ...report.days, ...days };
        if (dayNotes) patch.dayNotes = { ...report.dayNotes, ...dayNotes };
      }
      // Reverting goes first, so "back to draft and change day 3" is one call.
      if (rest.status === "draft" && Object.keys(patch).length > 1) {
        await call(api, "PATCH", `/reports/${reportId}`, { status: "draft" });
      }
      return call(api, "PATCH", `/reports/${reportId}`, patch);
    },
  }),

  year_summary: tool({
    description:
      "Days billed, revenue per currency, average daily rate and utilisation for a year, per client and per company. Completed reports only.",
    input: z.object({ year, companyId: id("Company").optional() }),
    readOnly: true,
    run: ({ year, companyId }, api) =>
      call(api, "GET", `/reporting?year=${year}&company=${encodeURIComponent(companyId ?? "")}`),
  }),

  export_pdf: tool({
    description: "The PDF the client receives, for a completed report.",
    input: z.object({
      reportId: id("Report"),
      locale,
      saveTo: z.string().optional().describe("Absolute path of a new .pdf file, or of a directory (local server only)"),
    }),
    readOnly: true,
    run: async ({ reportId, locale, saveTo }, api, options) => {
      const res = await api(`/api/reports/${reportId}/pdf?locale=${locale}`);
      if (!res.ok) throw new ToolError(((await res.json()) as { error: string }).error);
      const pdf = Buffer.from(await res.arrayBuffer());
      const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "report.pdf";

      if (saveTo) {
        if (!options.canWriteFiles) throw new ToolError("saveTo is only available on the local (stdio) server.");
        if (!isAbsolute(saveTo)) throw new ToolError("saveTo must be an absolute path.");
        const path = saveTo.endsWith(".pdf") ? saveTo : `${saveTo.replace(/\/$/, "")}/${filename}`;
        // Never overwrite: an agent misled by text it read must not be able to clobber a file.
        try {
          writeFileSync(path, pdf, { flag: "wx" });
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "EEXIST") throw new ToolError(`${path} already exists.`);
          throw err;
        }
        return `Saved ${path}`;
      }
      return [
        { type: "text", text: filename },
        {
          type: "resource",
          resource: {
            uri: `presto://reports/${reportId}/pdf`,
            mimeType: "application/pdf",
            blob: pdf.toString("base64"),
          },
        },
      ] satisfies Content[];
    },
  }),

  create_client: tool({
    description: "Add a client. Its currency and holiday country apply to every mission and report for it.",
    input: z.object({
      name: z.string(),
      currency: z.string().describe("ISO 4217, e.g. EUR"),
      holidayCountry: z.string().describe("ISO 3166-1 alpha-2, e.g. FR"),
      email: z.string().optional(),
      address: z.string().optional(),
      businessId: z.string().optional().describe("SIRET, VAT number…"),
    }),
    run: (args, api) => call(api, "POST", "/clients", args),
  }),

  create_mission: tool({
    description: "Add a mission for a client, billed by one of the companies, at a daily rate.",
    input: z.object({
      name: z.string(),
      clientId: id("Client"),
      companyId: id("Company"),
      dailyRate: z.number().optional().describe("In the client's currency"),
      startDate: z.string().optional().describe("YYYY-MM-DD"),
      endDate: z.string().optional().describe("YYYY-MM-DD"),
    }),
    run: (args, api) => call(api, "POST", "/missions", args),
  }),

  update_mission: tool({
    description:
      "Change a mission's name, daily rate, dates or active flag. A new rate applies to reports created or completed from now on; completed reports keep the rate they were sent with.",
    input: z.object({
      missionId: id("Mission"),
      name: z.string().optional(),
      dailyRate: z.number().nullable().optional().describe("In the client's currency"),
      startDate: z.string().nullable().optional().describe("YYYY-MM-DD"),
      endDate: z.string().nullable().optional().describe("YYYY-MM-DD"),
      isActive: z.boolean().optional(),
    }),
    run: ({ missionId, ...patch }, api) => call(api, "PATCH", `/missions/${missionId}`, patch),
  }),
};

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => {
    const { $schema: _, ...inputSchema } = z.toJSONSchema(t.input, { io: "input" });
    return {
      name,
      description: t.description,
      inputSchema,
      annotations: { readOnlyHint: !!t.readOnly, destructiveHint: false },
    };
  });
}

async function callTool(name: string, args: unknown, api: ApiFetch, options: McpOptions) {
  const t = TOOLS[name];
  if (!t) return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  try {
    const result = await t.run(t.input.parse(args ?? {}), api, options);
    const content = Array.isArray(result)
      ? result
      : [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }];
    return { content };
  } catch (err) {
    const message =
      err instanceof z.ZodError ? z.prettifyError(err) : err instanceof ToolError ? err.message : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** Handle one JSON-RPC message. Returns null for notifications, which get no reply. */
export async function handleMcp(message: unknown, api: ApiFetch, options: McpOptions): Promise<object | null> {
  const req = message as JsonRpcRequest;
  if (!req || typeof req !== "object" || typeof req.method !== "string") {
    return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } };
  }
  if (req.id === undefined) return null;

  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: req.id, result });

  switch (req.method) {
    case "initialize": {
      const asked = req.params?.protocolVersion as string;
      return reply({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "presto", title: config.appName, version: config.version },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: toolList() });
    case "tools/call":
      return reply(await callTool(req.params?.name as string, req.params?.arguments, api, options));
    default:
      return { jsonrpc: "2.0", id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }
}
