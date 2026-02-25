export { createId } from "./id.js";

import { relations } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../lib/config.js";
import * as schema from "./schema/pg.schema.js";

export const { users, userSettings, companies, clients, missions, activityReports, reportEntries } = schema;

// Relations (defined once using the schema tables)
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings),
  companies: many(companies),
  clients: many(clients),
  missions: many(missions),
  activityReports: many(activityReports),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  missions: many(missions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  client: one(clients, { fields: [missions.clientId], references: [clients.id] }),
  company: one(companies, { fields: [missions.companyId], references: [companies.id] }),
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
  companiesRelations,
  clientsRelations,
  missionsRelations,
  activityReportsRelations,
  reportEntriesRelations,
};

type FullSchema = typeof fullSchema;

const pool = new pg.Pool({ connectionString: config.database.url });

export const db: NodePgDatabase<FullSchema> = drizzle(pool, { schema: fullSchema });

export async function closeDb() {
  await pool.end();
}
