import { and, asc, count, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { HTTPException } from "hono/http-exception";
import { activityReports, clients, companies, db, missions } from "./index.js";

type OwnedModel = "activityReport" | "client" | "company" | "mission";

const ownedModels = {
  activityReport: { query: "activityReports", table: activityReports, label: "Activity" },
  client: { query: "clients", table: clients, label: "Client" },
  company: { query: "companies", table: companies, label: "Company" },
  mission: { query: "missions", table: missions, label: "Mission" },
} as const;

/**
 * Ownership-checked lookup. Throws HTTPException(404) if not found or not owned by user.
 */
export async function findOwned(model: OwnedModel, id: string, userId: string) {
  const { query, table, label } = ownedModels[model];
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle relational query namespace can't be narrowed from a union
  const record = await (db.query as any)[query].findFirst({
    where: and(eq(table.id, id), eq(table.userId, userId)),
  });
  if (!record) {
    throw new HTTPException(404, { message: `${label} not found` });
  }
  return record;
}

/**
 * Insert a row and return it.
 * Accepts an optional transaction handle; defaults to the module-level `db`.
 */
export async function insertReturning<T extends PgTable>(
  table: T,
  values: T["$inferInsert"],
  trx?: typeof db,
): Promise<T["$inferSelect"]> {
  const d = trx ?? db;
  const [row] = await d
    .insert(table)
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic insert values require cast
    .values(values as any)
    .returning();
  return row as T["$inferSelect"];
}

/**
 * Update a row by id and return it.
 * Accepts an optional transaction handle; defaults to the module-level `db`.
 */
export async function updateReturning<T extends PgTable>(
  table: T,
  id: string,
  values: Partial<T["$inferInsert"]>,
  trx?: typeof db,
): Promise<T["$inferSelect"]> {
  const d = trx ?? db;
  const idCol = (table as Record<string, unknown>).id as PgColumn;
  const rows = (await d
    .update(table)
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle generic set values require cast
    .set(values as any)
    .where(eq(idCol, id))
    .returning()) as T["$inferSelect"][];
  if (!rows[0]) throw new HTTPException(404, { message: "Record not found" });
  return rows[0];
}

/** Relational include: mission with client + company summary. */
export const MISSION_WITH = {
  client: { columns: { id: true, name: true, color: true, currency: true } },
  company: { columns: { id: true, name: true } },
} as const;

// biome-ignore lint/suspicious/noExplicitAny: Drizzle relational orderBy callback types are unresolvable without cast
const ENTRIES_ORDERED = { orderBy: (e: any, _: any) => [asc(e.date)] };

/** Relational include: standard activity report with entries + mission. */
export const REPORT_WITH = {
  entries: ENTRIES_ORDERED,
  mission: {
    with: {
      client: { columns: { id: true, name: true, color: true, currency: true, holidayCountry: true } },
      company: { columns: { id: true, name: true } },
    },
  },
} as const;

/** Relational include: activity report for PDF export. */
export const REPORT_WITH_PDF = {
  entries: ENTRIES_ORDERED,
  mission: { with: { client: true, company: { columns: { name: true } } } },
  user: { columns: { firstName: true, lastName: true } },
} as const;

/**
 * Count rows in `table` where `fkColumn` equals `id`.
 * Used before delete to check for dependent records.
 */
export async function checkDependents(table: PgTable, fkColumn: PgColumn, id: string): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(eq(fkColumn, id));
  return row?.value ?? 0;
}
