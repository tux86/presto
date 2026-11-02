import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { type Db, openDb } from "../src/db/index.ts";
import { createApp, type Env } from "../src/server/app.ts";
import { handleMcp } from "../src/server/mcp.ts";

let db: Db;
let app: Hono<Env>;
let nextId = 1;

async function rpc(method: string, params?: object, headers: Record<string, string> = {}) {
  const res = await app.request("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

/** Call a tool and return its parsed JSON, or the error text when it failed. */
async function tool(name: string, args: object = {}) {
  const { body } = await rpc("tools/call", { name, arguments: args });
  const text = body.result.content[0].text as string;
  return { isError: body.result.isError === true, text, json: () => JSON.parse(text) };
}

async function seed() {
  const { companies } = (await tool("get_overview")).json();
  const client = (await tool("create_client", { name: "Globex", currency: "EUR", holidayCountry: "FR" })).json();
  const mission = (
    await tool("create_mission", { name: "API", clientId: client.id, companyId: companies[0].id, dailyRate: 600 })
  ).json();
  const report = (await tool("create_report", { missionId: mission.id, year: 2026, month: 5 })).json();
  return { reportId: report.id as string, missionId: mission.id as string };
}

beforeEach(() => {
  db = openDb(":memory:");
  app = createApp(db, {});
});

describe("protocol", () => {
  test("initialize negotiates the version and announces tools", async () => {
    const { body } = await rpc("initialize", { protocolVersion: "2025-06-18" });
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.capabilities).toEqual({ tools: {} });
    expect(body.result.instructions).toContain("privateNote");
  });

  test("an unknown protocol version gets the latest", async () => {
    const { body } = await rpc("initialize", { protocolVersion: "1999-01-01" });
    expect(body.result.protocolVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("tools/list exposes JSON schemas", async () => {
    const { body } = await rpc("tools/list");
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("update_report");
    const update = body.result.tools.find((t: { name: string }) => t.name === "update_report");
    expect(update.inputSchema.required).toEqual(["reportId"]);
  });

  test("notifications get no reply", async () => {
    expect(
      await handleMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, app.request, {
        canWriteFiles: false,
      }),
    ).toBeNull();
  });

  test("unknown methods are a JSON-RPC error", async () => {
    const { body } = await rpc("resources/list");
    expect(body.error.code).toBe(-32601);
  });
});

describe("HTTP transport", () => {
  test("requires the token when one is configured", async () => {
    app = createApp(db, { token: "s3cret" });
    expect((await rpc("ping")).status).toBe(401);
    expect((await rpc("ping", {}, { Authorization: "Bearer wrong" })).status).toBe(401);
    expect((await rpc("ping", {}, { Authorization: "Bearer s3cret" })).status).toBe(200);
  });

  test("refuses a cross-origin browser", async () => {
    const { status } = await rpc("ping", {}, { Origin: "https://evil.example", Host: "localhost:3001" });
    expect(status).toBe(403);
  });
});

describe("tools", () => {
  test("fill, then take a day off, without touching the rest", async () => {
    const { reportId } = await seed();
    await tool("fill_report", { reportId, from: "workdays" });
    // May 2026 in France: 21 weekdays, 4 of them public holidays (1, 8, 14, 25).
    expect((await tool("get_report", { reportId })).json().days).toBe(17);

    const updated = (await tool("update_report", { reportId, days: { "4": 0, "5": 0.5 } })).json();
    expect(updated.days["4"]).toBeUndefined();
    expect(updated.days["5"]).toBe(0.5);
    expect(updated.days["6"]).toBe(1);
  });

  test("the report calendar names holidays", async () => {
    const { reportId } = await seed();
    const report = (await tool("get_report", { reportId })).json();
    expect(report.calendar).toHaveLength(31);
    expect(report.calendar[0]).toMatchObject({ day: 1, date: "2026-05-01", holiday: expect.any(String) });
  });

  test("a completed report refuses edits, and reverting in the same call works", async () => {
    const { reportId } = await seed();
    await tool("update_report", { reportId, status: "completed" });

    const refused = await tool("update_report", { reportId, days: { "4": 1 } });
    expect(refused.isError).toBe(true);
    expect(refused.text).toContain("completed");

    const reverted = (await tool("update_report", { reportId, status: "draft", days: { "4": 1 } })).json();
    expect(reverted).toMatchObject({ status: "draft", days: { "4": 1 } });
  });

  test("bad arguments come back as a tool error, not a crash", async () => {
    const result = await tool("create_report", { missionId: "x", year: 2026, month: 13 });
    expect(result.isError).toBe(true);
  });

  test("export_pdf returns the document, and refuses drafts", async () => {
    const { reportId } = await seed();
    expect((await tool("export_pdf", { reportId })).isError).toBe(true);

    await tool("update_report", { reportId, status: "completed" });
    const { body } = await rpc("tools/call", { name: "export_pdf", arguments: { reportId } });
    const blob = body.result.content[1].resource.blob as string;
    expect(Buffer.from(blob, "base64").subarray(0, 4).toString()).toBe("%PDF");
  });

  test("only the local server writes files", async () => {
    const { reportId } = await seed();
    await tool("update_report", { reportId, status: "completed" });
    const dir = mkdtempSync(join(tmpdir(), "presto-"));

    expect((await tool("export_pdf", { reportId, saveTo: dir })).isError).toBe(true);

    const local = await handleMcp(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "export_pdf", arguments: { reportId, saveTo: join(dir, "may.pdf") } },
      },
      app.request,
      { canWriteFiles: true },
    );
    expect(JSON.stringify(local)).toContain("Saved");
    expect(readFileSync(join(dir, "may.pdf")).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("get_overview lists the year's reports with totals", async () => {
    await seed();
    const overview = (await tool("get_overview", { year: 2026 })).json();
    expect(overview.reports[0]).toMatchObject({ month: "2026-05", client: "Globex", days: 0, currency: "EUR" });
  });
});
