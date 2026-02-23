export { createId } from "./id.js";

import { relations } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { config } from "../lib/config.js";

// PG schema provides the canonical TypeScript types.
// At runtime, we load the dialect-specific schema so Drizzle generates correct SQL
// (column constructors like timestamp/integer/datetime are dialect-specific).
import type * as PgSchema from "./schema/pg.schema.js";

type Tables = typeof PgSchema;

const { provider, url } = config.database;

// Dynamically import the schema matching the active database dialect
const schema: Tables =
  provider === "mysql"
    ? ((await import("./schema/mysql.schema.js")) as unknown as Tables)
    : provider === "sqlite"
      ? ((await import("./schema/sqlite.schema.js")) as unknown as Tables)
      : await import("./schema/pg.schema.js");

export const { users, userSettings, exchangeRates, clients, missions, activityReports, reportEntries } = schema;

// Relations (defined once using the runtime-resolved tables)
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings),
  clients: many(clients),
  missions: many(missions),
  activityReports: many(activityReports),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  client: one(clients, { fields: [missions.clientId], references: [clients.id] }),
  user: one(users, { fields: [missions.userId], references: [users.id] }),
  activityReports: many(activityReports),
}));

export const activityReportsRelations = relations(activityReports, ({ one, many }) => ({
  mission: one(missions, { fields: [activityReports.missionId], references: [missions.id] }),
  user: one(users, { fields: [activityReports.userId], references: [users.id] }),
  entries: many(reportEntries),
}));

export const reportEntriesRelations = relations(reportEntries, ({ one }) => ({
  report: one(activityReports, { fields: [reportEntries.reportId], references: [activityReports.id] }),
}));

// Full schema (tables + relations) for the drizzle instance
const fullSchema = {
  ...schema,
  usersRelations,
  userSettingsRelations,
  clientsRelations,
  missionsRelations,
  activityReportsRelations,
  reportEntriesRelations,
};

type FullSchema = typeof fullSchema;

// Create the db instance with the correct driver
let _db: NodePgDatabase<FullSchema>;
let _closeDb: () => Promise<void>;

if (provider === "mysql") {
  const { drizzle } = await import("drizzle-orm/mysql2");
  const mysql = await import("mysql2/promise");
  const pool = await mysql.createPool(url);
  _db = drizzle(pool, { schema: fullSchema, mode: "default" }) as unknown as NodePgDatabase<FullSchema>;
  _closeDb = async () => {
    await pool.end();
  };
} else if (provider === "sqlite") {
  const { drizzle } = await import("drizzle-orm/bun-sqlite");
  const { Database } = await import("bun:sqlite");
  const dbPath = url.replace(/^file:/, "");
  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  _db = drizzle(sqlite, { schema: fullSchema }) as unknown as NodePgDatabase<FullSchema>;
  _closeDb = async () => {
    sqlite.close();
  };
} else {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString: url });
  _db = drizzle(pool, { schema: fullSchema });
  _closeDb = async () => {
    await pool.end();
  };
}

export const db: NodePgDatabase<FullSchema> = _db;

export async function closeDb() {
  await _closeDb();
}
