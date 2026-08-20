/**
 * Import a Presto v1 export into a v2 database.
 *
 *   1. Run Presto v1 and use Profile → Export all data
 *   2. bun run import:v1 presto-v1-export.json
 *
 * Reads v1's JSON export rather than its PostgreSQL database, so no driver is
 * needed and the import still works after the old server is gone.
 *
 * Safe to inspect first: pass --dry-run to see what would be written.
 */
import { isoDate } from "../src/core/dates.ts";
import type { DayValue } from "../src/core/types.ts";
import { openDb } from "../src/db/index.ts";
import * as repo from "../src/db/repo.ts";
import { databasePath } from "../src/server/config.ts";

interface V1Entry {
  date: string;
  value: number;
  note: string | null;
}

interface V1Report {
  month: number;
  year: number;
  status: string;
  note: string | null;
  privateNote: string | null;
  dailyRate: number | null;
  holidayCountry: string;
  entries: V1Entry[];
}

interface V1Mission {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
  dailyRate: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  activityReports: V1Report[];
}

interface V1Export {
  companies: { id: string; name: string; address: string | null; businessId: string | null; isDefault: boolean }[];
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    businessId: string | null;
    color: string | null;
    currency: string;
    holidayCountry: string;
  }[];
  missions: V1Mission[];
}

/** v1 stored dates as full timestamps; v2 wants plain calendar dates. */
function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : isoDate(date);
}

function toDayValue(value: number): DayValue | null {
  if (value === 1 || value === 0.5) return value;
  return null;
}

/** v1 kept one row per calendar day; v2 keeps a sparse map keyed by day-of-month. */
function toDayMaps(entries: V1Entry[]): { days: Record<string, DayValue>; dayNotes: Record<string, string> } {
  const days: Record<string, DayValue> = {};
  const dayNotes: Record<string, string> = {};

  for (const entry of entries) {
    const iso = toIsoDate(entry.date);
    if (!iso) continue;
    const key = String(Number(iso.slice(8, 10)));

    const value = toDayValue(entry.value);
    if (value) days[key] = value;

    const note = entry.note?.trim();
    if (note) dayNotes[key] = note;
  }

  return { days, dayNotes };
}

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  fail("usage: bun run import:v1 <presto-v1-export.json> [--dry-run]");
}

const raw = await Bun.file(file)
  .text()
  .catch(() => fail(`cannot read ${file}`));

let data: V1Export;
try {
  data = JSON.parse(raw) as V1Export;
} catch {
  fail(`${file} is not valid JSON`);
}

if (!Array.isArray(data.missions) || !Array.isArray(data.clients)) {
  fail("this does not look like a Presto v1 export (no missions or clients)");
}

const reportCount = data.missions.reduce((n, m) => n + (m.activityReports?.length ?? 0), 0);
console.log(
  `Found ${data.companies?.length ?? 0} companies, ${data.clients.length} clients, ` +
    `${data.missions.length} missions, ${reportCount} reports.`,
);

if (dryRun) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

const path = databasePath();
const db = openDb(path);

if (repo.listClients(db).length > 0 || repo.listReports(db).length > 0) {
  fail(`${path} already contains data. Move it aside and run again.`);
}

// v1 ids are carried over so nothing has to be rewritten by hand afterwards.
const companyIds = new Map<string, string>();
const clientIds = new Map<string, string>();
let imported = 0;
let skipped = 0;

db.transaction(() => {
  for (const company of data.companies ?? []) {
    const created = repo.createCompany(db, {
      name: company.name,
      address: company.address ?? null,
      businessId: company.businessId ?? null,
      isDefault: Boolean(company.isDefault),
    });
    companyIds.set(company.id, created.id);
  }

  for (const client of data.clients) {
    const created = repo.createClient(db, {
      name: client.name,
      email: client.email ?? null,
      phone: client.phone ?? null,
      address: client.address ?? null,
      businessId: client.businessId ?? null,
      // v1 allowed colours v2 does not know; drop rather than guess.
      color: (client.color as never) ?? null,
      currency: client.currency,
      holidayCountry: client.holidayCountry,
    });
    clientIds.set(client.id, created.id);
  }

  for (const mission of data.missions) {
    const clientId = clientIds.get(mission.clientId);
    const companyId = companyIds.get(mission.companyId) ?? repo.ensureDefaultCompany(db).id;
    if (!clientId) {
      console.warn(`  skipping mission "${mission.name}": its client is not in the export`);
      skipped += mission.activityReports?.length ?? 0;
      continue;
    }

    const created = repo.createMission(db, {
      name: mission.name,
      clientId,
      companyId,
      dailyRate: mission.dailyRate ?? null,
      startDate: toIsoDate(mission.startDate),
      endDate: toIsoDate(mission.endDate),
      isActive: mission.isActive !== false,
    });

    for (const report of mission.activityReports ?? []) {
      const { days, dayNotes } = toDayMaps(report.entries ?? []);
      const row = repo.createReport(db, {
        missionId: created.id,
        year: report.year,
        month: report.month,
        dailyRate: report.dailyRate ?? mission.dailyRate ?? null,
        holidayCountry: report.holidayCountry,
        days,
      });
      repo.updateReport(db, row.id, {
        status: report.status === "COMPLETED" ? "completed" : "draft",
        dayNotes,
        note: report.note ?? null,
        privateNote: report.privateNote ?? null,
      });
      imported++;
    }
  }
})();

db.close();

console.log(`Imported ${imported} reports into ${path}.`);
if (skipped > 0) console.log(`Skipped ${skipped} reports whose mission could not be resolved.`);
