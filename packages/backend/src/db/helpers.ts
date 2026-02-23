import { and, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { HTTPException } from "hono/http-exception";
import { config } from "../lib/config.js";
import { activityReports, clients, db, missions } from "./index.js";

type OwnedModel = "activityReport" | "client" | "mission";

const ownedModels = {
  activityReport: { query: "activityReports", table: activityReports, label: "Activity" },
  client: { query: "clients", table: clients, label: "Client" },
  mission: { query: "missions", table: missions, label: "Mission" },
} as const;

/**
 * Ownership-checked lookup. Throws HTTPException(404) if not found or not owned by user.
 */
export async function findOwned(model: OwnedModel, id: string, userId: string) {
  const { query, table, label } = ownedModels[model];
  // Cast needed: TypeScript can't narrow a union of query namespaces to call findFirst
  const record = await (db.query as any)[query].findFirst({
    where: and(eq(table.id, id), eq(table.userId, userId)),
  });
  if (!record) {
    throw new HTTPException(404, { message: `${label} not found` });
  }
  return record;
}

/**
 * Insert a row and return it. Handles MySQL's lack of RETURNING clause.
 * Accepts an optional transaction handle; defaults to the module-level `db`.
 */
export async function insertReturning<T extends PgTable>(
  table: T,
  values: T["$inferInsert"],
  trx?: typeof db,
): Promise<T["$inferSelect"]> {
  const d = trx ?? db;
  if (config.database.provider === "mysql") {
    await d.insert(table).values(values as any);
    const id = (values as Record<string, unknown>).id;
    const [row] = await d
      .select()
      .from(table as any)
      .where(eq((table as Record<string, any>).id, id))
      .limit(1);
    return row as T["$inferSelect"];
  }
  const [row] = await d
    .insert(table)
    .values(values as any)
    .returning();
  return row as T["$inferSelect"];
}

/**
 * Update a row by id and return it. Handles MySQL's lack of RETURNING clause.
 */
export async function updateReturning<T extends PgTable>(
  table: T,
  id: string,
  values: Partial<T["$inferInsert"]>,
): Promise<T["$inferSelect"]> {
  const idCol = (table as Record<string, any>).id;
  if (config.database.provider === "mysql") {
    await db
      .update(table)
      .set(values as any)
      .where(eq(idCol, id));
    const [row] = await db
      .select()
      .from(table as any)
      .where(eq(idCol, id))
      .limit(1);
    if (!row) throw new HTTPException(404, { message: "Record not found" });
    return row as T["$inferSelect"];
  }
  const rows = (await db
    .update(table)
    .set(values as any)
    .where(eq(idCol, id))
    .returning()) as T["$inferSelect"][];
  if (!rows[0]) throw new HTTPException(404, { message: "Record not found" });
  return rows[0];
}

/** Relational include: mission with client summary. */
export const MISSION_WITH = {
  client: { columns: { id: true, name: true, currency: true } },
} as const;

const ENTRIES_ORDERED = { orderBy: (e: any, { asc }: any) => [asc(e.date)] };

/** Relational include: standard activity report with entries + mission. */
export const REPORT_WITH = {
  entries: ENTRIES_ORDERED,
  mission: {
    with: { client: { columns: { id: true, name: true, color: true, currency: true, holidayCountry: true } } },
  },
} as const;

/** Relational include: activity report for PDF export. */
export const REPORT_WITH_PDF = {
  entries: ENTRIES_ORDERED,
  mission: { with: { client: true } },
  user: { columns: { firstName: true, lastName: true, company: true } },
} as const;
