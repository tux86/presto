import type { YearSummary } from "../core/reporting.ts";
import type { Client, Company, Mission, Report, ReportContext } from "../core/types.ts";

/** An error carrying the server's message, and the dependent count for a 409. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly entity?: string,
    readonly count?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError("offline", 0);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
      res.status,
      body.code as string | undefined,
      body.entity as string | undefined,
      body.count as number | undefined,
    );
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface AppState {
  app: { name: string; version: string };
  countries: string[];
  companies: Company[];
  clients: Client[];
  missions: Mission[];
  reports: Report[];
  /** Public-holiday dates per country, so the browser can shade a calendar. */
  holidays: Record<string, string[]>;
}

/** A report with its relations, plus named holidays for its month. */
export type ReportDetail = ReportContext & { holidays: Record<string, string> };

export const api = {
  state: () => request<AppState>("/state"),

  createCompany: (body: unknown) => send<Company>("POST", "/companies", body),
  updateCompany: (id: string, body: unknown) => send<Company>("PATCH", `/companies/${id}`, body),
  deleteCompany: (id: string) => send<void>("DELETE", `/companies/${id}`),

  createClient: (body: unknown) => send<Client>("POST", "/clients", body),
  updateClient: (id: string, body: unknown) => send<Client>("PATCH", `/clients/${id}`, body),
  deleteClient: (id: string) => send<void>("DELETE", `/clients/${id}`),

  createMission: (body: unknown) => send<Mission>("POST", "/missions", body),
  updateMission: (id: string, body: unknown) => send<Mission>("PATCH", `/missions/${id}`, body),
  deleteMission: (id: string) => send<void>("DELETE", `/missions/${id}`),

  report: (id: string, locale: string) => request<ReportDetail>(`/reports/${id}?locale=${locale}`),
  createReport: (body: unknown) => send<Report>("POST", "/reports", body),
  updateReport: (id: string, body: unknown) => send<Report>("PATCH", `/reports/${id}`, body),
  deleteReport: (id: string) => send<void>("DELETE", `/reports/${id}`),
  fillReport: (id: string) => send<Report>("POST", `/reports/${id}/fill`),
  clearReport: (id: string) => send<Report>("POST", `/reports/${id}/clear`),
  copyPrevious: (id: string) => send<Report>("POST", `/reports/${id}/copy-previous`),

  year: (year: number) => request<YearSummary>(`/reporting?year=${year}`),
} as const;

/** Trigger a browser download for one of the export endpoints. */
export function download(path: string): void {
  const a = document.createElement("a");
  a.href = `/api${path}`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}
