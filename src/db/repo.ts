import type {
  Client,
  ClientColor,
  Company,
  DayValue,
  Mission,
  Report,
  ReportContext,
  ReportStatus,
} from "../core/types.ts";
import { type Db, newId, now } from "./index.ts";

// ── Row shapes ───────────────────────────────────────────────────────────────
// SQLite has no boolean or JSON type: flags arrive as 0/1 and maps as TEXT.

interface CompanyRow {
  id: string;
  name: string;
  address: string | null;
  businessId: string | null;
  isDefault: number;
}

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessId: string | null;
  color: string | null;
  currency: string;
  holidayCountry: string;
}

interface MissionRow {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
  dailyRate: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: number;
}

interface ReportRow {
  id: string;
  missionId: string;
  year: number;
  month: number;
  status: string;
  dailyRate: number | null;
  holidayCountry: string;
  days: string;
  dayNotes: string;
  note: string | null;
  privateNote: string | null;
}

function toCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    businessId: r.businessId,
    isDefault: r.isDefault === 1,
  };
}

function toClient(r: ClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    businessId: r.businessId,
    color: r.color as ClientColor | null,
    currency: r.currency,
    holidayCountry: r.holidayCountry,
  };
}

function toMission(r: MissionRow): Mission {
  return {
    id: r.id,
    name: r.name,
    clientId: r.clientId,
    companyId: r.companyId,
    dailyRate: r.dailyRate,
    startDate: r.startDate,
    endDate: r.endDate,
    isActive: r.isActive === 1,
  };
}

/** Tolerate a corrupt or hand-edited JSON column rather than crashing a read. */
function parseMap<T>(raw: string, valid: (v: unknown) => v is T): Record<string, T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (valid(value)) out[key] = value;
  }
  return out;
}

const isDayValueLoose = (v: unknown): v is DayValue => v === 0 || v === 0.5 || v === 1;
const isString = (v: unknown): v is string => typeof v === "string";

function toReport(r: ReportRow): Report {
  return {
    id: r.id,
    missionId: r.missionId,
    year: r.year,
    month: r.month,
    status: r.status as ReportStatus,
    dailyRate: r.dailyRate,
    holidayCountry: r.holidayCountry,
    days: parseMap(r.days, isDayValueLoose),
    dayNotes: parseMap(r.dayNotes, isString),
    note: r.note,
    privateNote: r.privateNote,
  };
}

// ── Generic update ───────────────────────────────────────────────────────────

type Value = string | number | null;

/**
 * Build an UPDATE from the patch keys present in `columns`.
 * Column names come from the fixed allowlist, never from caller input.
 */
function update(db: Db, table: string, columns: readonly string[], id: string, patch: Record<string, Value>): boolean {
  const keys = columns.filter((c) => patch[c] !== undefined);
  if (keys.length === 0) return true;
  const sets = keys.map((k) => `${k} = $${k}`).join(", ");
  const params: Record<string, Value> = { id };
  for (const key of keys) params[key] = patch[key]!;
  const result = db.query(`UPDATE ${table} SET ${sets} WHERE id = $id`).run(params);
  return result.changes > 0;
}

function boolCol(v: boolean | undefined): number | undefined {
  return v === undefined ? undefined : v ? 1 : 0;
}

// ── Companies ────────────────────────────────────────────────────────────────

export type CompanyInput = Omit<Company, "id">;

export function listCompanies(db: Db): Company[] {
  return db
    .query("SELECT * FROM company ORDER BY isDefault DESC, name COLLATE NOCASE")
    .all()
    .map((r) => toCompany(r as CompanyRow));
}

export function getCompany(db: Db, id: string): Company | null {
  const row = db.query("SELECT * FROM company WHERE id = $id").get({ id }) as CompanyRow | null;
  return row ? toCompany(row) : null;
}

export function createCompany(db: Db, input: CompanyInput): Company {
  const id = newId();
  db.transaction(() => {
    if (input.isDefault) db.query("UPDATE company SET isDefault = 0").run();
    db.query(
      `INSERT INTO company (id, name, address, businessId, isDefault, createdAt)
       VALUES ($id, $name, $address, $businessId, $isDefault, $createdAt)`,
    ).run({
      id,
      name: input.name,
      address: input.address,
      businessId: input.businessId,
      isDefault: input.isDefault ? 1 : 0,
      createdAt: now(),
    });
    // The first company is always the default, whatever the caller asked for.
    db.query("UPDATE company SET isDefault = 1 WHERE (SELECT COUNT(*) FROM company) = 1").run();
  })();
  return getCompany(db, id)!;
}

export function updateCompany(db: Db, id: string, patch: Partial<CompanyInput>): Company | null {
  db.transaction(() => {
    if (patch.isDefault === true) db.query("UPDATE company SET isDefault = 0").run();
    update(db, "company", ["name", "address", "businessId", "isDefault"], id, {
      ...patch,
      isDefault: boolCol(patch.isDefault),
    } as Record<string, Value>);
  })();
  return getCompany(db, id);
}

export function deleteCompany(db: Db, id: string): void {
  db.query("DELETE FROM company WHERE id = $id").run({ id });
  // Never leave the set without a default.
  db.query(
    "UPDATE company SET isDefault = 1 WHERE id = (SELECT id FROM company ORDER BY name LIMIT 1) AND NOT EXISTS (SELECT 1 FROM company WHERE isDefault = 1)",
  ).run();
}

/** Create a starter company so a fresh install is immediately usable. */
export function ensureDefaultCompany(db: Db, name = "My Company"): Company {
  const existing = db.query("SELECT * FROM company ORDER BY isDefault DESC LIMIT 1").get() as CompanyRow | null;
  if (existing) return toCompany(existing);
  return createCompany(db, { name, address: null, businessId: null, isDefault: true });
}

// ── Clients ──────────────────────────────────────────────────────────────────

export type ClientInput = Omit<Client, "id">;

export function listClients(db: Db): Client[] {
  return db
    .query("SELECT * FROM client ORDER BY name COLLATE NOCASE")
    .all()
    .map((r) => toClient(r as ClientRow));
}

export function getClient(db: Db, id: string): Client | null {
  const row = db.query("SELECT * FROM client WHERE id = $id").get({ id }) as ClientRow | null;
  return row ? toClient(row) : null;
}

export function createClient(db: Db, input: ClientInput): Client {
  const id = newId();
  db.query(
    `INSERT INTO client (id, name, email, phone, address, businessId, color, currency, holidayCountry, createdAt)
     VALUES ($id, $name, $email, $phone, $address, $businessId, $color, $currency, $holidayCountry, $createdAt)`,
  ).run({ id, ...input, createdAt: now() });
  return getClient(db, id)!;
}

export function updateClient(db: Db, id: string, patch: Partial<ClientInput>): Client | null {
  update(
    db,
    "client",
    ["name", "email", "phone", "address", "businessId", "color", "currency", "holidayCountry"],
    id,
    patch as Record<string, Value>,
  );
  return getClient(db, id);
}

export function deleteClient(db: Db, id: string): void {
  db.query("DELETE FROM client WHERE id = $id").run({ id });
}

// ── Missions ─────────────────────────────────────────────────────────────────

export type MissionInput = Omit<Mission, "id">;

export function listMissions(db: Db): Mission[] {
  return db
    .query("SELECT * FROM mission ORDER BY isActive DESC, name COLLATE NOCASE")
    .all()
    .map((r) => toMission(r as MissionRow));
}

export function getMission(db: Db, id: string): Mission | null {
  const row = db.query("SELECT * FROM mission WHERE id = $id").get({ id }) as MissionRow | null;
  return row ? toMission(row) : null;
}

export function createMission(db: Db, input: MissionInput): Mission {
  const id = newId();
  db.query(
    `INSERT INTO mission (id, name, clientId, companyId, dailyRate, startDate, endDate, isActive, createdAt)
     VALUES ($id, $name, $clientId, $companyId, $dailyRate, $startDate, $endDate, $isActive, $createdAt)`,
  ).run({ id, ...input, isActive: input.isActive ? 1 : 0, createdAt: now() });
  return getMission(db, id)!;
}

export function updateMission(db: Db, id: string, patch: Partial<MissionInput>): Mission | null {
  update(db, "mission", ["name", "clientId", "companyId", "dailyRate", "startDate", "endDate", "isActive"], id, {
    ...patch,
    isActive: boolCol(patch.isActive),
  } as Record<string, Value>);
  return getMission(db, id);
}

export function deleteMission(db: Db, id: string): void {
  db.query("DELETE FROM mission WHERE id = $id").run({ id });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface ReportInput {
  missionId: string;
  year: number;
  month: number;
  dailyRate: number | null;
  holidayCountry: string;
  days?: Record<string, DayValue>;
}

export interface ReportPatch {
  status?: ReportStatus;
  days?: Record<string, DayValue>;
  dayNotes?: Record<string, string>;
  note?: string | null;
  privateNote?: string | null;
}

export function listReports(db: Db, year?: number): Report[] {
  const sql = year
    ? "SELECT * FROM report WHERE year = $year ORDER BY year DESC, month DESC"
    : "SELECT * FROM report ORDER BY year DESC, month DESC";
  const rows = year ? db.query(sql).all({ year }) : db.query(sql).all();
  return rows.map((r) => toReport(r as ReportRow));
}

export function getReport(db: Db, id: string): Report | null {
  const row = db.query("SELECT * FROM report WHERE id = $id").get({ id }) as ReportRow | null;
  return row ? toReport(row) : null;
}

export function findReport(db: Db, missionId: string, year: number, month: number): Report | null {
  const row = db
    .query("SELECT * FROM report WHERE missionId = $missionId AND year = $year AND month = $month")
    .get({ missionId, year, month }) as ReportRow | null;
  return row ? toReport(row) : null;
}

export function createReport(db: Db, input: ReportInput): Report {
  const id = newId();
  const timestamp = now();
  db.query(
    `INSERT INTO report (id, missionId, year, month, status, dailyRate, holidayCountry, days, dayNotes, createdAt, updatedAt)
     VALUES ($id, $missionId, $year, $month, 'draft', $dailyRate, $holidayCountry, $days, '{}', $createdAt, $updatedAt)`,
  ).run({
    id,
    missionId: input.missionId,
    year: input.year,
    month: input.month,
    dailyRate: input.dailyRate,
    holidayCountry: input.holidayCountry,
    days: JSON.stringify(input.days ?? {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return getReport(db, id)!;
}

export function updateReport(db: Db, id: string, patch: ReportPatch): Report | null {
  const values: Record<string, Value> = { updatedAt: now() };
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.days !== undefined) values.days = JSON.stringify(patch.days);
  if (patch.dayNotes !== undefined) values.dayNotes = JSON.stringify(patch.dayNotes);
  if (patch.note !== undefined) values.note = patch.note;
  if (patch.privateNote !== undefined) values.privateNote = patch.privateNote;
  update(db, "report", ["status", "days", "dayNotes", "note", "privateNote", "updatedAt"], id, values);
  return getReport(db, id);
}

export function deleteReport(db: Db, id: string): void {
  db.query("DELETE FROM report WHERE id = $id").run({ id });
}

// ── Joined reads ─────────────────────────────────────────────────────────────

interface ContextRow extends ReportRow {
  m_id: string;
  m_name: string;
  m_clientId: string;
  m_companyId: string;
  m_dailyRate: number | null;
  m_startDate: string | null;
  m_endDate: string | null;
  m_isActive: number;
  cl_id: string;
  cl_name: string;
  cl_email: string | null;
  cl_phone: string | null;
  cl_address: string | null;
  cl_businessId: string | null;
  cl_color: string | null;
  cl_currency: string;
  cl_holidayCountry: string;
  co_id: string;
  co_name: string;
  co_address: string | null;
  co_businessId: string | null;
  co_isDefault: number;
}

const CONTEXT_SQL = `
  SELECT r.*,
         m.id m_id, m.name m_name, m.clientId m_clientId, m.companyId m_companyId,
         m.dailyRate m_dailyRate, m.startDate m_startDate, m.endDate m_endDate, m.isActive m_isActive,
         c.id cl_id, c.name cl_name, c.email cl_email, c.phone cl_phone, c.address cl_address,
         c.businessId cl_businessId, c.color cl_color, c.currency cl_currency, c.holidayCountry cl_holidayCountry,
         o.id co_id, o.name co_name, o.address co_address, o.businessId co_businessId, o.isDefault co_isDefault
  FROM report r
  JOIN mission m ON m.id = r.missionId
  JOIN client  c ON c.id = m.clientId
  JOIN company o ON o.id = m.companyId
`;

function toContext(r: ContextRow): ReportContext {
  return {
    report: toReport(r),
    mission: toMission({
      id: r.m_id,
      name: r.m_name,
      clientId: r.m_clientId,
      companyId: r.m_companyId,
      dailyRate: r.m_dailyRate,
      startDate: r.m_startDate,
      endDate: r.m_endDate,
      isActive: r.m_isActive,
    }),
    client: toClient({
      id: r.cl_id,
      name: r.cl_name,
      email: r.cl_email,
      phone: r.cl_phone,
      address: r.cl_address,
      businessId: r.cl_businessId,
      color: r.cl_color,
      currency: r.cl_currency,
      holidayCountry: r.cl_holidayCountry,
    }),
    company: toCompany({
      id: r.co_id,
      name: r.co_name,
      address: r.co_address,
      businessId: r.co_businessId,
      isDefault: r.co_isDefault,
    }),
  };
}

/** A report with the mission, client and company it belongs to. */
export function getReportContext(db: Db, id: string): ReportContext | null {
  const row = db.query(`${CONTEXT_SQL} WHERE r.id = $id`).get({ id }) as ContextRow | null;
  return row ? toContext(row) : null;
}

export function listReportContexts(
  db: Db,
  opts: { year?: number; status?: ReportStatus; companyId?: string } = {},
): ReportContext[] {
  const where: string[] = [];
  const params: Record<string, Value> = {};
  if (opts.year !== undefined) {
    where.push("r.year = $year");
    params.year = opts.year;
  }
  if (opts.status !== undefined) {
    where.push("r.status = $status");
    params.status = opts.status;
  }
  if (opts.companyId !== undefined) {
    where.push("m.companyId = $companyId");
    params.companyId = opts.companyId;
  }
  const sql = `${CONTEXT_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY r.year, r.month`;
  const rows = where.length ? db.query(sql).all(params) : db.query(sql).all();
  return rows.map((r) => toContext(r as ContextRow));
}

// ── Referential guards ───────────────────────────────────────────────────────

function count(db: Db, sql: string, params: Record<string, Value>): number {
  return (db.query(sql).get(params) as { n: number }).n;
}

export function countMissionsForClient(db: Db, clientId: string): number {
  return count(db, "SELECT COUNT(*) n FROM mission WHERE clientId = $clientId", { clientId });
}

export function countMissionsForCompany(db: Db, companyId: string): number {
  return count(db, "SELECT COUNT(*) n FROM mission WHERE companyId = $companyId", { companyId });
}

export function countReportsForMission(db: Db, missionId: string): number {
  return count(db, "SELECT COUNT(*) n FROM report WHERE missionId = $missionId", { missionId });
}

/** Years that have at least one report, most recent first. */
export function reportYears(db: Db): number[] {
  return db
    .query("SELECT DISTINCT year FROM report ORDER BY year DESC")
    .all()
    .map((r) => (r as { year: number }).year);
}

/** Everything in the database, for the JSON export. */
export function dumpAll(db: Db) {
  return {
    companies: listCompanies(db),
    clients: listClients(db),
    missions: listMissions(db),
    reports: listReports(db),
  };
}
