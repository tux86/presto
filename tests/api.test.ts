import { beforeEach, describe, expect, test } from "bun:test";
import type { Hono } from "hono";
import { type Db, openDb } from "../src/db/index.ts";
import * as repo from "../src/db/repo.ts";
import { createApp, type Env } from "../src/server/app.ts";

let db: Db;
let app: Hono<Env>;

async function call(method: string, path: string, body?: unknown) {
  const res = await app.request(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, res };
}

async function seed() {
  const state = await call("GET", "/state");
  const companyId = state.body.companies[0].id;
  const client = await call("POST", "/clients", {
    name: "Globex",
    currency: "EUR",
    holidayCountry: "FR",
    color: "indigo",
  });
  const mission = await call("POST", "/missions", {
    name: "API rewrite",
    clientId: client.body.id,
    companyId,
    dailyRate: 650,
  });
  return { companyId, clientId: client.body.id, missionId: mission.body.id };
}

beforeEach(() => {
  db = openDb(":memory:");
  app = createApp(db);
});

describe("GET /api/state", () => {
  test("returns the whole dataset in one request", async () => {
    const { status, body } = await call("GET", "/state");
    expect(status).toBe(200);
    expect(body).toMatchObject({ app: { name: expect.any(String) } });
    expect(body.clients).toEqual([]);
    expect(body.reports).toEqual([]);
    expect(body.countries).toContain("FR");
  });

  test("creates a starter company so a fresh install is usable", async () => {
    const { body } = await call("GET", "/state");
    expect(body.companies).toHaveLength(1);
    expect(body.companies[0].isDefault).toBe(true);
  });
});

describe("validation", () => {
  test("rejects a client with no name", async () => {
    const { status, body } = await call("POST", "/clients", { name: "", currency: "EUR", holidayCountry: "FR" });
    expect(status).toBe(400);
    expect(body.error).toContain("name");
  });

  test("rejects a malformed currency or country code", async () => {
    expect((await call("POST", "/clients", { name: "X", currency: "euro", holidayCountry: "FR" })).status).toBe(400);
    expect((await call("POST", "/clients", { name: "X", currency: "EUR", holidayCountry: "FRA" })).status).toBe(400);
  });

  test("rejects a mission whose end date precedes its start", async () => {
    const { companyId, clientId } = await seed();
    const { status, body } = await call("POST", "/missions", {
      name: "Backwards",
      clientId,
      companyId,
      startDate: "2026-06-01",
      endDate: "2026-01-01",
    });
    expect(status).toBe(400);
    expect(body.error).toContain("endDate");
  });

  test("normalises blank optional fields to null", async () => {
    const { body } = await call("POST", "/clients", {
      name: "Blank",
      currency: "EUR",
      holidayCountry: "FR",
      email: "",
      phone: "   ",
    });
    expect(body.email).toBeNull();
    expect(body.phone).toBeNull();
  });
});

describe("referential integrity", () => {
  test("a client with missions returns 409 with the dependent count", async () => {
    const { clientId } = await seed();
    const { status, body } = await call("DELETE", `/clients/${clientId}`);
    expect(status).toBe(409);
    expect(body).toMatchObject({ code: "IN_USE", entity: "missions", count: 1 });
  });

  test("a mission with reports returns 409", async () => {
    const { missionId } = await seed();
    await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const { status, body } = await call("DELETE", `/missions/${missionId}`);
    expect(status).toBe(409);
    expect(body).toMatchObject({ code: "IN_USE", entity: "reports", count: 1 });
  });

  test("deleting is allowed once the dependents are gone", async () => {
    const { clientId, missionId } = await seed();
    expect((await call("DELETE", `/missions/${missionId}`)).status).toBe(204);
    expect((await call("DELETE", `/clients/${clientId}`)).status).toBe(204);
  });

  test("unknown ids are 404, not 500", async () => {
    expect((await call("GET", "/reports/nope")).status).toBe(404);
    expect((await call("PATCH", "/clients/nope", { name: "x" })).status).toBe(404);
    expect((await call("DELETE", "/missions/nope")).status).toBe(404);
  });

  test("unknown API paths are 404 JSON", async () => {
    const { status, body } = await call("GET", "/nope");
    expect(status).toBe(404);
    expect(body.error).toBe("Not found");
  });
});

describe("reports", () => {
  test("creating one snapshots the mission rate and the client's holidays", async () => {
    const { missionId } = await seed();
    const { status, body } = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    expect(status).toBe(201);
    expect(body).toMatchObject({ dailyRate: 650, holidayCountry: "FR", status: "draft", days: {} });
  });

  test("refuses a duplicate month for the same mission", async () => {
    const { missionId } = await seed();
    await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const { status, body } = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    expect(status).toBe(400);
    expect(body.error).toContain("already exists");
  });

  test("refuses a month outside the mission's date range", async () => {
    const { companyId, clientId } = await seed();
    const mission = await call("POST", "/missions", {
      name: "Q1 only",
      clientId,
      companyId,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    const id = mission.body.id;
    expect((await call("POST", "/reports", { missionId: id, year: 2026, month: 2 })).status).toBe(201);
    const before = await call("POST", "/reports", { missionId: id, year: 2025, month: 12 });
    expect(before.status).toBe(400);
    expect(before.body.error).toContain("starts on");
    const after = await call("POST", "/reports", { missionId: id, year: 2026, month: 4 });
    expect(after.status).toBe(400);
    expect(after.body.error).toContain("ended on");
  });

  test("stores day values and drops the zeroes", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const { body } = await call("PATCH", `/reports/${created.body.id}`, {
      days: { "3": 1, "4": 0.5, "5": 0 },
      dayNotes: { "3": "kickoff", "4": "   " },
    });
    expect(body.days).toEqual({ "3": 1, "4": 0.5 });
    expect(body.dayNotes).toEqual({ "3": "kickoff" });
  });

  test("rejects day values that are not 0, 0.5 or 1", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    expect((await call("PATCH", `/reports/${created.body.id}`, { days: { "3": 2 } })).status).toBe(400);
    expect((await call("PATCH", `/reports/${created.body.id}`, { days: { "32": 1 } })).status).toBe(400);
  });

  test("fill marks every workday and skips weekends and holidays", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 7 });
    const { body } = await call("POST", `/reports/${created.body.id}/fill`);
    expect(body.days["13"]).toBe(1); // Monday
    expect(body.days["14"]).toBeUndefined(); // Bastille Day
    expect(body.days["4"]).toBeUndefined(); // Saturday
  });

  test("clear empties days and notes", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    await call("POST", `/reports/${created.body.id}/fill`);
    const { body } = await call("POST", `/reports/${created.body.id}/clear`);
    expect(body.days).toEqual({});
    expect(body.dayNotes).toEqual({});
  });

  test("detail returns the report with its mission, client and company", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const { body } = await call("GET", `/reports/${created.body.id}`);
    expect(body.client.name).toBe("Globex");
    expect(body.mission.name).toBe("API rewrite");
    expect(body.company.isDefault).toBe(true);
  });

  test("listing filters by year", async () => {
    const { missionId } = await seed();
    await call("POST", "/reports", { missionId, year: 2026, month: 1 });
    await call("POST", "/reports", { missionId, year: 2025, month: 1 });
    expect((await call("GET", "/reports")).body).toHaveLength(2);
    expect((await call("GET", "/reports?year=2026")).body).toHaveLength(1);
    expect((await call("GET", "/reports?year=nope")).status).toBe(400);
  });
});

describe("completed reports are frozen", () => {
  async function completedReport() {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    await call("POST", `/reports/${created.body.id}/fill`);
    await call("PATCH", `/reports/${created.body.id}`, { status: "completed" });
    return created.body.id as string;
  }

  test("content edits are refused", async () => {
    const id = await completedReport();
    expect((await call("PATCH", `/reports/${id}`, { days: { "3": 1 } })).status).toBe(400);
    expect((await call("PATCH", `/reports/${id}`, { note: "late change" })).status).toBe(400);
    expect((await call("POST", `/reports/${id}/fill`)).status).toBe(400);
    expect((await call("POST", `/reports/${id}/clear`)).status).toBe(400);
  });

  test("the private note stays editable — it is not part of the document", async () => {
    const id = await completedReport();
    const { status, body } = await call("PATCH", `/reports/${id}`, { privateNote: "chased invoice" });
    expect(status).toBe(200);
    expect(body.privateNote).toBe("chased invoice");
  });

  test("deleting is refused until it is reverted", async () => {
    const id = await completedReport();
    expect((await call("DELETE", `/reports/${id}`)).status).toBe(400);
    await call("PATCH", `/reports/${id}`, { status: "draft" });
    expect((await call("DELETE", `/reports/${id}`)).status).toBe(204);
  });

  test("reverting to draft restores editing", async () => {
    const id = await completedReport();
    await call("PATCH", `/reports/${id}`, { status: "draft" });
    expect((await call("PATCH", `/reports/${id}`, { note: "now allowed" })).status).toBe(200);
  });
});

describe("copy-previous", () => {
  test("carries last month's weekday rhythm into this month", async () => {
    const { missionId } = await seed();
    const june = await call("POST", "/reports", { missionId, year: 2026, month: 6 });
    await call("POST", `/reports/${june.body.id}/fill`);
    const july = await call("POST", "/reports", { missionId, year: 2026, month: 7 });

    const { status, body } = await call("POST", `/reports/${july.body.id}/copy-previous`);
    expect(status).toBe(200);
    expect(body.days["13"]).toBe(1);
    expect(body.days["14"]).toBeUndefined(); // July's own holiday is respected
  });

  test("rolls over the year boundary", async () => {
    const { missionId } = await seed();
    const dec = await call("POST", "/reports", { missionId, year: 2025, month: 12 });
    await call("POST", `/reports/${dec.body.id}/fill`);
    const jan = await call("POST", "/reports", { missionId, year: 2026, month: 1 });
    expect((await call("POST", `/reports/${jan.body.id}/copy-previous`)).status).toBe(200);
  });

  test("explains itself when there is nothing to copy", async () => {
    const { missionId } = await seed();
    const aug = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const { status, body } = await call("POST", `/reports/${aug.body.id}/copy-previous`);
    expect(status).toBe(400);
    expect(body.error).toContain("no report for the previous month");
  });

  test("refuses to copy an empty month", async () => {
    const { missionId } = await seed();
    await call("POST", "/reports", { missionId, year: 2026, month: 6 });
    const july = await call("POST", "/reports", { missionId, year: 2026, month: 7 });
    const { status, body } = await call("POST", `/reports/${july.body.id}/copy-previous`);
    expect(status).toBe(400);
    expect(body.error).toContain("empty");
  });
});

describe("reporting and export", () => {
  async function completedYear() {
    const { missionId } = await seed();
    for (const month of [1, 2]) {
      const r = await call("POST", "/reports", { missionId, year: 2026, month });
      await call("POST", `/reports/${r.body.id}/fill`);
      await call("PATCH", `/reports/${r.body.id}`, { status: "completed" });
    }
  }

  test("counts only completed reports", async () => {
    const { missionId } = await seed();
    const draft = await call("POST", "/reports", { missionId, year: 2026, month: 1 });
    await call("POST", `/reports/${draft.body.id}/fill`);
    expect((await call("GET", "/reporting?year=2026")).body.totalDays).toBe(0);

    await call("PATCH", `/reports/${draft.body.id}`, { status: "completed" });
    expect((await call("GET", "/reporting?year=2026")).body.totalDays).toBeGreaterThan(0);
  });

  test("groups revenue by currency without converting", async () => {
    await completedYear();
    const { body } = await call("GET", "/reporting?year=2026");
    expect(body.currencies).toEqual(["EUR"]);
    expect(body.byCurrency.EUR.revenue).toBeGreaterThan(0);
    expect(body.months).toHaveLength(12);
  });

  test("defaults to the current year", async () => {
    const { body } = await call("GET", "/reporting");
    expect(body.year).toBe(new Date().getUTCFullYear());
  });

  test("compares the running year against the same months, not a full one", async () => {
    const thisYear = new Date().getUTCFullYear();
    const { body: running } = await call("GET", `/reporting?year=${thisYear}`);
    expect(running.previous?.partial ?? true).toBe(true);

    const { body: finished } = await call("GET", `/reporting?year=${thisYear - 1}`);
    expect(finished.previous?.partial ?? false).toBe(false);
  });

  test("CSV export is a downloadable attachment including drafts", async () => {
    const { missionId } = await seed();
    const r = await call("POST", "/reports", { missionId, year: 2026, month: 1 });
    await call("POST", `/reports/${r.body.id}/fill`);

    const res = await app.request("/api/export/csv?year=2026");
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("presto-2026.csv");
    const text = await res.text();
    expect(text).toContain("Globex");
    expect(text).toContain("draft");
  });

  test("JSON export contains every table", async () => {
    await seed();
    const res = await app.request("/api/export/json");
    const body = await res.json();
    expect(body).toMatchObject({ exportedAt: expect.any(String) });
    expect(body.clients).toHaveLength(1);
    expect(body.missions).toHaveLength(1);
  });
});

describe("health", () => {
  test("reports ok with a version", async () => {
    const { status, body } = await call("GET", "/health");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(repo.listCompanies(db)).toBeDefined();
  });
});

describe("PDF export", () => {
  test("refuses a draft and serves a completed report", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 8 });
    const id = created.body.id;
    await call("POST", `/reports/${id}/fill`);

    const draft = await call("GET", `/reports/${id}/pdf`);
    expect(draft.status).toBe(400);
    expect(draft.body.error).toContain("completed");

    await call("PATCH", `/reports/${id}`, { status: "completed" });
    const res = await app.request(`/api/reports/${id}/pdf`);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("report-globex-2026-08.pdf");
    expect(
      Buffer.from(await res.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
  });
});

describe("holiday calendars for the browser", () => {
  test("state ships holiday dates for the countries in use", async () => {
    await seed();
    const { body } = await call("GET", "/state");
    expect(body.holidays.FR).toBeArray();
    expect(body.holidays.FR.length).toBeGreaterThan(5);
    expect(body.holidays.FR.every((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
  });

  test("report detail ships named holidays in the requested locale", async () => {
    const { missionId } = await seed();
    const created = await call("POST", "/reports", { missionId, year: 2026, month: 12 });
    const en = await call("GET", `/reports/${created.body.id}?locale=en`);
    const fr = await call("GET", `/reports/${created.body.id}?locale=fr`);
    expect(en.body.holidays["2026-12-25"]).toBe("Christmas Day");
    expect(fr.body.holidays["2026-12-25"]).toBe("Noël");
  });
});

describe("reporting filtered by company", () => {
  async function twoCompanies() {
    const { companyId, clientId, missionId } = await seed();
    const second = await call("POST", "/companies", { name: "Second Entity" });
    const other = await call("POST", "/missions", {
      name: "Side work",
      clientId,
      companyId: second.body.id,
      dailyRate: 400,
    });
    for (const id of [missionId, other.body.id]) {
      const r = await call("POST", "/reports", { missionId: id, year: 2026, month: 3 });
      await call("POST", `/reports/${r.body.id}/fill`);
      await call("PATCH", `/reports/${r.body.id}`, { status: "completed" });
    }
    return { companyId, secondId: second.body.id as string };
  }

  test("narrows the summary to one company", async () => {
    const { companyId } = await twoCompanies();

    const all = await call("GET", "/reporting?year=2026");
    expect(all.body.companies).toHaveLength(2);

    const one = await call("GET", `/reporting?year=2026&company=${companyId}`);
    expect(one.body.companies).toHaveLength(1);
    expect(one.body.companies[0].companyId).toBe(companyId);
    expect(one.body.totalDays).toBeLessThan(all.body.totalDays);
  });

  test("an empty company parameter means every company", async () => {
    await twoCompanies();
    const blank = await call("GET", "/reporting?year=2026&company=");
    expect(blank.body.companies).toHaveLength(2);
  });

  test("narrows the CSV export too", async () => {
    const { secondId } = await twoCompanies();
    const res = await app.request(`/api/export/csv?year=2026&company=${secondId}`);
    const text = await res.text();
    expect(text).toContain("Second Entity");
    expect(text).not.toContain("Acme Consulting");
  });
});
