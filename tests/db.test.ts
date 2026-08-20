import { beforeEach, describe, expect, test } from "bun:test";
import { type Db, migrate, newId, openDb } from "../src/db/index.ts";
import * as repo from "../src/db/repo.ts";
import { MIGRATIONS } from "../src/db/schema.ts";

let db: Db;

function seed() {
  const company = repo.ensureDefaultCompany(db);
  const client = repo.createClient(db, {
    name: "Globex",
    email: null,
    phone: null,
    address: null,
    businessId: null,
    color: "indigo",
    currency: "EUR",
    holidayCountry: "FR",
  });
  const mission = repo.createMission(db, {
    name: "API rewrite",
    clientId: client.id,
    companyId: company.id,
    dailyRate: 650,
    startDate: null,
    endDate: null,
    isActive: true,
  });
  return { company, client, mission };
}

beforeEach(() => {
  db = openDb(":memory:");
});

describe("migrations", () => {
  test("bring a fresh database to the current version", () => {
    const version = (db.query("PRAGMA user_version").get() as { user_version: number }).user_version;
    expect(version).toBe(MIGRATIONS.length);
  });

  test("are idempotent — a second run applies nothing", () => {
    expect(migrate(db)).toBe(0);
    expect(migrate(db)).toBe(0);
  });

  test("enforce foreign keys", () => {
    expect(() =>
      repo.createMission(db, {
        name: "Orphan",
        clientId: "nope",
        companyId: "nope",
        dailyRate: null,
        startDate: null,
        endDate: null,
        isActive: true,
      }),
    ).toThrow();
  });
});

describe("newId", () => {
  test("is 21 URL-safe characters and does not collide", () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{21}$/);
  });
});

describe("companies", () => {
  test("the first company is the default even if not requested", () => {
    const c = repo.createCompany(db, { name: "Solo", address: null, businessId: null, isDefault: false });
    expect(repo.getCompany(db, c.id)!.isDefault).toBe(true);
  });

  test("only one company is default at a time", () => {
    const first = repo.createCompany(db, { name: "First", address: null, businessId: null, isDefault: true });
    const second = repo.createCompany(db, { name: "Second", address: null, businessId: null, isDefault: true });
    expect(repo.getCompany(db, first.id)!.isDefault).toBe(false);
    expect(repo.getCompany(db, second.id)!.isDefault).toBe(true);
    expect(repo.listCompanies(db).filter((c) => c.isDefault)).toHaveLength(1);
  });

  test("deleting the default promotes another", () => {
    const first = repo.createCompany(db, { name: "First", address: null, businessId: null, isDefault: true });
    repo.createCompany(db, { name: "Second", address: null, businessId: null, isDefault: false });
    repo.deleteCompany(db, first.id);
    expect(repo.listCompanies(db).filter((c) => c.isDefault)).toHaveLength(1);
  });

  test("ensureDefaultCompany creates once and then reuses", () => {
    const a = repo.ensureDefaultCompany(db);
    const b = repo.ensureDefaultCompany(db);
    expect(a.id).toBe(b.id);
    expect(repo.listCompanies(db)).toHaveLength(1);
  });

  test("a partial update leaves other fields alone", () => {
    const c = repo.createCompany(db, { name: "Acme", address: "1 Rue", businessId: "SIRET", isDefault: true });
    repo.updateCompany(db, c.id, { name: "Acme SAS" });
    expect(repo.getCompany(db, c.id)).toMatchObject({ name: "Acme SAS", address: "1 Rue", businessId: "SIRET" });
  });
});

describe("clients and missions", () => {
  test("round-trip a client", () => {
    const { client } = seed();
    expect(repo.getClient(db, client.id)).toEqual(client);
    expect(repo.listClients(db)).toEqual([client]);
  });

  test("round-trip a mission, mapping the boolean flag", () => {
    const { mission } = seed();
    expect(repo.getMission(db, mission.id)!.isActive).toBe(true);
    repo.updateMission(db, mission.id, { isActive: false });
    expect(repo.getMission(db, mission.id)!.isActive).toBe(false);
  });

  test("count dependents before deleting", () => {
    const { client, company, mission } = seed();
    expect(repo.countMissionsForClient(db, client.id)).toBe(1);
    expect(repo.countMissionsForCompany(db, company.id)).toBe(1);
    expect(repo.countReportsForMission(db, mission.id)).toBe(0);
  });

  test("a client with missions cannot be deleted", () => {
    const { client } = seed();
    expect(() => repo.deleteClient(db, client.id)).toThrow();
  });

  test("missing rows read as null, not undefined", () => {
    expect(repo.getClient(db, "nope")).toBeNull();
    expect(repo.getMission(db, "nope")).toBeNull();
    expect(repo.getReport(db, "nope")).toBeNull();
  });
});

describe("reports", () => {
  test("round-trip the sparse day maps through their JSON columns", () => {
    const { mission } = seed();
    const created = repo.createReport(db, {
      missionId: mission.id,
      year: 2026,
      month: 8,
      dailyRate: 650,
      holidayCountry: "FR",
    });
    repo.updateReport(db, created.id, { days: { "3": 1, "4": 0.5 }, dayNotes: { "3": "kickoff" } });

    const read = repo.getReport(db, created.id)!;
    expect(read.days).toEqual({ "3": 1, "4": 0.5 });
    expect(read.dayNotes).toEqual({ "3": "kickoff" });
    expect(read.status).toBe("draft");
  });

  test("one report per mission and month", () => {
    const { mission } = seed();
    const input = { missionId: mission.id, year: 2026, month: 8, dailyRate: 650, holidayCountry: "FR" };
    repo.createReport(db, input);
    expect(() => repo.createReport(db, input)).toThrow();
  });

  test("the same month for a different mission is fine", () => {
    const { client, company, mission } = seed();
    const second = repo.createMission(db, {
      name: "Support",
      clientId: client.id,
      companyId: company.id,
      dailyRate: 500,
      startDate: null,
      endDate: null,
      isActive: true,
    });
    repo.createReport(db, { missionId: mission.id, year: 2026, month: 8, dailyRate: 650, holidayCountry: "FR" });
    expect(() =>
      repo.createReport(db, { missionId: second.id, year: 2026, month: 8, dailyRate: 500, holidayCountry: "FR" }),
    ).not.toThrow();
    expect(repo.listReports(db)).toHaveLength(2);
  });

  test("findReport locates by mission and month", () => {
    const { mission } = seed();
    repo.createReport(db, { missionId: mission.id, year: 2026, month: 8, dailyRate: 650, holidayCountry: "FR" });
    expect(repo.findReport(db, mission.id, 2026, 8)).not.toBeNull();
    expect(repo.findReport(db, mission.id, 2026, 9)).toBeNull();
  });

  test("survives a corrupt JSON column instead of crashing the read", () => {
    const { mission } = seed();
    const r = repo.createReport(db, {
      missionId: mission.id,
      year: 2026,
      month: 8,
      dailyRate: 650,
      holidayCountry: "FR",
    });
    db.query("UPDATE report SET days = 'not json', dayNotes = '[1,2]' WHERE id = $id").run({ id: r.id });
    expect(repo.getReport(db, r.id)!.days).toEqual({});
    expect(repo.getReport(db, r.id)!.dayNotes).toEqual({});
  });

  test("discards out-of-range values from a hand-edited file", () => {
    const { mission } = seed();
    const r = repo.createReport(db, {
      missionId: mission.id,
      year: 2026,
      month: 8,
      dailyRate: 650,
      holidayCountry: "FR",
    });
    db.query(`UPDATE report SET days = '{"1":1,"2":7,"3":"x"}' WHERE id = $id`).run({ id: r.id });
    expect(repo.getReport(db, r.id)!.days).toEqual({ "1": 1 });
  });

  test("lists years that have reports, most recent first", () => {
    const { mission } = seed();
    for (const year of [2024, 2026, 2025]) {
      repo.createReport(db, { missionId: mission.id, year, month: 1, dailyRate: 650, holidayCountry: "FR" });
    }
    expect(repo.reportYears(db)).toEqual([2026, 2025, 2024]);
  });

  test("a mission with reports cannot be deleted", () => {
    const { mission } = seed();
    repo.createReport(db, { missionId: mission.id, year: 2026, month: 8, dailyRate: 650, holidayCountry: "FR" });
    expect(() => repo.deleteMission(db, mission.id)).toThrow();
  });
});

describe("joined reads", () => {
  test("getReportContext assembles report, mission, client and company", () => {
    const { company, client, mission } = seed();
    const report = repo.createReport(db, {
      missionId: mission.id,
      year: 2026,
      month: 8,
      dailyRate: 650,
      holidayCountry: "FR",
      days: { "3": 1 },
    });
    const ctx = repo.getReportContext(db, report.id)!;
    expect(ctx.report.days).toEqual({ "3": 1 });
    expect(ctx.mission.name).toBe(mission.name);
    expect(ctx.client.name).toBe(client.name);
    expect(ctx.company.name).toBe(company.name);
    expect(ctx.mission.isActive).toBe(true);
    expect(ctx.company.isDefault).toBe(true);
  });

  test("listReportContexts filters by year and status", () => {
    const { mission } = seed();
    const a = repo.createReport(db, {
      missionId: mission.id,
      year: 2026,
      month: 1,
      dailyRate: 650,
      holidayCountry: "FR",
    });
    repo.createReport(db, { missionId: mission.id, year: 2025, month: 1, dailyRate: 650, holidayCountry: "FR" });
    repo.updateReport(db, a.id, { status: "completed" });

    expect(repo.listReportContexts(db)).toHaveLength(2);
    expect(repo.listReportContexts(db, { year: 2026 })).toHaveLength(1);
    expect(repo.listReportContexts(db, { status: "completed" })).toHaveLength(1);
    expect(repo.listReportContexts(db, { year: 2025, status: "completed" })).toHaveLength(0);
  });
});

describe("dumpAll", () => {
  test("exports every table", () => {
    seed();
    const dump = repo.dumpAll(db);
    expect(dump.companies).toHaveLength(1);
    expect(dump.clients).toHaveLength(1);
    expect(dump.missions).toHaveLength(1);
    expect(dump.reports).toHaveLength(0);
  });
});
