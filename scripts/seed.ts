/**
 * Fill a database with a plausible freelancing history, for trying Presto out
 * and for working on it. Not shipped in the Docker image and never run
 * automatically — Presto has no demo mode.
 *
 *   bun run seed            # refuses if the database already has data
 *   bun run seed --reset    # wipe it first
 *
 * The data is deterministic: the same command always produces the same months,
 * so a screenshot or a bug report stays reproducible.
 */
import { buildMonthGrid, isWorkday } from "../src/core/grid.ts";
import { forCountry } from "../src/core/holidays.ts";
import type { ClientColor, DayValue } from "../src/core/types.ts";
import { openDb } from "../src/db/index.ts";
import * as repo from "../src/db/repo.ts";
import { databasePath } from "../src/server/config.ts";

const TODAY = new Date();
const NOW = { year: TODAY.getUTCFullYear(), month: TODAY.getUTCMonth() + 1, day: TODAY.getUTCDate() };

/** Deterministic PRNG, so re-seeding produces byte-identical months. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// English: this fixture ships in a repository whose default language is English.
const DAY_NOTES = [
  "Sprint planning",
  "Code review",
  "Scoping workshop",
  "Steering committee",
  "Production release",
  "User acceptance testing",
  "Data migration",
  "Progress check-in",
  "On-call",
  "Writing specifications",
];

interface Rhythm {
  /** Monday-based weekdays worked: Mon=0 … Sun=6. */
  weekdays: number[];
  from: { year: number; month: number };
  to?: { year: number; month: number };
  /** Weeks taken off, 1-indexed, per month. */
  timeOff?: Partial<Record<number, number[]>>;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

function inRange(rhythm: Rhythm, year: number, month: number): boolean {
  const at = monthIndex(year, month);
  if (at < monthIndex(rhythm.from.year, rhythm.from.month)) return false;
  if (rhythm.to && at > monthIndex(rhythm.to.year, rhythm.to.month)) return false;
  return true;
}

/**
 * Turn a weekly rhythm into a month of entries.
 * Weekends and public holidays are skipped, August and December are quieter,
 * and the current month stops at today.
 */
function buildMonth(
  rhythm: Rhythm,
  year: number,
  month: number,
  country: string,
  random: () => number,
): { days: Record<string, DayValue>; notes: Record<string, string> } {
  const days: Record<string, DayValue> = {};
  const notes: Record<string, string> = {};
  const isCurrentMonth = year === NOW.year && month === NOW.month;
  const off = rhythm.timeOff?.[month] ?? [];

  for (const day of buildMonthGrid(year, month, forCountry(country))) {
    if (!isWorkday(day)) continue;
    if (!rhythm.weekdays.includes(day.weekday)) continue;
    if (isCurrentMonth && day.day > NOW.day) continue;
    if (off.includes(Math.ceil(day.day / 7))) continue;

    const roll = random();
    // Roughly one day in eight is a half day; one in twelve is not worked.
    if (roll < 0.08) continue;
    days[String(day.day)] = roll < 0.2 ? 0.5 : 1;

    if (random() < 0.22) {
      notes[String(day.day)] = DAY_NOTES[Math.floor(random() * DAY_NOTES.length)]!;
    }
  }

  return { days, notes };
}

// ── The story ────────────────────────────────────────────────────────────────
// A freelance consultant billing through two entities. One long engagement
// winds down as a Swiss one ramps up, which is what makes the yearly view
// interesting: two currencies, two companies, overlapping months.

const COMPANIES = [
  {
    key: "consulting",
    name: "Karray Consulting",
    address: "12 rue des Petites Écuries, 75010 Paris",
    businessId: "SIRET 892 456 731 00018",
    isDefault: true,
  },
  {
    key: "studio",
    name: "WK Studio",
    address: "12 rue des Petites Écuries, 75010 Paris",
    businessId: "SIRET 519 874 203 00027",
    isDefault: false,
  },
];

const CLIENTS = [
  {
    key: "altimea",
    name: "Altimea",
    email: "compta@altimea.fr",
    phone: "+33 1 44 82 10 30",
    address: "9 boulevard Haussmann, 75009 Paris",
    businessId: "TVA FR32 892456731",
    color: "indigo" as ClientColor,
    currency: "EUR",
    holidayCountry: "FR",
  },
  {
    key: "lauvray",
    name: "Groupe Lauvray",
    email: "fournisseurs@lauvray.com",
    phone: null,
    address: "24 quai Perrache, 69002 Lyon",
    businessId: "TVA FR61 402118765",
    color: "emerald" as ClientColor,
    currency: "EUR",
    holidayCountry: "FR",
  },
  {
    key: "helvetia",
    name: "Helvetia Data",
    email: "accounts@helvetiadata.ch",
    phone: "+41 22 518 44 10",
    address: "Rue du Rhône 65, 1204 Genève",
    businessId: "CHE-114.902.673 TVA",
    color: "rose" as ClientColor,
    currency: "CHF",
    holidayCountry: "CH",
  },
  {
    key: "novaqua",
    name: "Novaqua",
    email: null,
    phone: null,
    address: "3 rue Kervégan, 44000 Nantes",
    businessId: null,
    color: "amber" as ClientColor,
    currency: "EUR",
    holidayCountry: "FR",
  },
];

const LAST_YEAR = NOW.year - 1;

const MISSIONS = [
  {
    key: "altimea",
    name: "E-commerce platform rebuild",
    client: "altimea",
    company: "consulting",
    dailyRate: 680,
    startDate: `${LAST_YEAR}-01-06`,
    endDate: null,
    isActive: true,
    seed: 101,
    rhythms: [
      // Four days a week through last year, then two as it winds down.
      {
        weekdays: [0, 1, 2, 3],
        from: { year: LAST_YEAR, month: 1 },
        to: { year: LAST_YEAR, month: 12 },
        timeOff: { 8: [2, 3], 12: [4, 5] },
      },
      { weekdays: [0, 1], from: { year: NOW.year, month: 1 }, timeOff: { 8: [2, 3] } },
    ] satisfies Rhythm[],
  },
  {
    key: "lauvray",
    name: "HR system migration",
    client: "lauvray",
    company: "consulting",
    dailyRate: 620,
    startDate: `${LAST_YEAR}-03-07`,
    endDate: `${NOW.year}-03-31`,
    isActive: false,
    seed: 202,
    rhythms: [
      { weekdays: [4], from: { year: LAST_YEAR, month: 3 }, to: { year: NOW.year, month: 3 }, timeOff: { 8: [2, 3] } },
    ] satisfies Rhythm[],
  },
  {
    key: "helvetia",
    name: "Data platform and governance",
    client: "helvetia",
    company: "consulting",
    dailyRate: 950,
    startDate: `${NOW.year}-02-02`,
    endDate: null,
    isActive: true,
    seed: 303,
    rhythms: [{ weekdays: [2, 3], from: { year: NOW.year, month: 2 }, timeOff: { 8: [2, 3] } }] satisfies Rhythm[],
  },
  {
    key: "novaqua",
    name: "Technical audit and advisory",
    client: "novaqua",
    company: "studio",
    dailyRate: 560,
    startDate: `${LAST_YEAR}-09-01`,
    endDate: null,
    isActive: true,
    seed: 404,
    rhythms: [
      { weekdays: [4], from: { year: LAST_YEAR, month: 9 }, to: { year: LAST_YEAR, month: 12 } },
      { weekdays: [4], from: { year: NOW.year, month: 4 }, timeOff: { 8: [2, 3] } },
    ] satisfies Rhythm[],
  },
];

const CLIENT_NOTES = [
  "Invoiced on the 1st of the following month, 30 days net.",
  "Days agreed with the project lead. Invoice sent separately.",
  "Delivered under the framework agreement signed on 12 January.",
  null,
];

const PRIVATE_NOTES = [
  "Chased on the 12th, paid on the 18th.",
  "Renegotiate the rate at the next renewal.",
  "Ask for a new purchase order before the next quarter.",
  null,
  null,
];

// ── Write it ─────────────────────────────────────────────────────────────────

const reset = process.argv.includes("--reset");
const path = databasePath();

if (reset) {
  for (const suffix of ["", "-shm", "-wal"]) {
    await Bun.file(`${path}${suffix}`)
      .delete()
      .catch(() => {});
  }
}

const db = openDb(path);

if (repo.listClients(db).length > 0 || repo.listReports(db).length > 0) {
  console.error(`error: ${path} already contains data. Re-run with --reset to wipe it.`);
  process.exit(1);
}

const companyIds = new Map<string, string>();
const clientIds = new Map<string, string>();
let reportCount = 0;

db.transaction(() => {
  // A starter company is created on first read; reuse it as the first entity
  // instead of leaving an empty "My Company" behind.
  const starter = repo.ensureDefaultCompany(db);
  const [first, ...rest] = COMPANIES;
  repo.updateCompany(db, starter.id, {
    name: first!.name,
    address: first!.address,
    businessId: first!.businessId,
    isDefault: true,
  });
  companyIds.set(first!.key, starter.id);

  for (const company of rest) {
    companyIds.set(company.key, repo.createCompany(db, company).id);
  }

  for (const client of CLIENTS) {
    clientIds.set(client.key, repo.createClient(db, client).id);
  }

  for (const mission of MISSIONS) {
    const client = CLIENTS.find((c) => c.key === mission.client)!;
    const created = repo.createMission(db, {
      name: mission.name,
      clientId: clientIds.get(mission.client)!,
      companyId: companyIds.get(mission.company)!,
      dailyRate: mission.dailyRate,
      startDate: mission.startDate,
      endDate: mission.endDate,
      isActive: mission.isActive,
    });

    const random = rng(mission.seed);

    for (let year = LAST_YEAR; year <= NOW.year; year++) {
      for (let month = 1; month <= 12; month++) {
        if (year === NOW.year && month > NOW.month) break;

        const rhythm = mission.rhythms.find((r) => inRange(r, year, month));
        if (!rhythm) continue;

        const { days, notes } = buildMonth(rhythm, year, month, client.holidayCountry, random);
        if (Object.keys(days).length === 0) continue;

        const report = repo.createReport(db, {
          missionId: created.id,
          year,
          month,
          dailyRate: mission.dailyRate,
          holidayCountry: client.holidayCountry,
          days,
        });

        // Everything before this month is settled; this month is still open.
        const isCurrent = year === NOW.year && month === NOW.month;
        repo.updateReport(db, report.id, {
          status: isCurrent ? "draft" : "completed",
          dayNotes: notes,
          note: isCurrent ? null : (CLIENT_NOTES[Math.floor(random() * CLIENT_NOTES.length)] ?? null),
          privateNote: PRIVATE_NOTES[Math.floor(random() * PRIVATE_NOTES.length)] ?? null,
        });
        reportCount++;
      }
    }
  }
})();

const drafts = repo.listReports(db).filter((r) => r.status === "draft").length;
db.close();

console.log(`Seeded ${path}`);
console.log(`  ${COMPANIES.length} companies, ${CLIENTS.length} clients, ${MISSIONS.length} missions`);
console.log(`  ${reportCount} reports across ${LAST_YEAR}–${NOW.year} (${drafts} still draft)`);
