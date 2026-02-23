// nanoid imported directly — drizzle-kit loads schemas via CJS and can't resolve local .ts files
// alphabet/length must match db/id.ts
import { customAlphabet } from "nanoid";

const createId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 21);

import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// Common column helpers
const cuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = () =>
  integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = sqliteTable("User", {
  id: cuid(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  company: text("company"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userSettings = sqliteTable("UserSettings", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  locale: text("locale").notNull().default("en"),
  baseCurrency: text("baseCurrency").notNull().default("EUR"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const exchangeRates = sqliteTable("ExchangeRate", {
  currency: text("currency").primaryKey(),
  rate: real("rate").notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const clients = sqliteTable(
  "Client",
  {
    id: cuid(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    businessId: text("businessId"),
    color: text("color"),
    currency: text("currency").notNull(),
    holidayCountry: text("holidayCountry").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Client_userId_idx").on(t.userId)],
);

export const missions = sqliteTable(
  "Mission",
  {
    id: cuid(),
    name: text("name").notNull(),
    clientId: text("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyRate: real("dailyRate"),
    startDate: integer("startDate", { mode: "timestamp_ms" }),
    endDate: integer("endDate", { mode: "timestamp_ms" }),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Mission_userId_idx").on(t.userId), index("Mission_clientId_idx").on(t.clientId)],
);

export const activityReports = sqliteTable(
  "ActivityReport",
  {
    id: cuid(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    status: text("status", { enum: ["DRAFT", "COMPLETED"] })
      .notNull()
      .default("DRAFT"),
    totalDays: real("totalDays").notNull().default(0),
    note: text("note"),
    dailyRate: real("dailyRate"),
    holidayCountry: text("holidayCountry").notNull(),
    missionId: text("missionId")
      .notNull()
      .references(() => missions.id, { onDelete: "restrict" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("ActivityReport_missionId_month_year_key").on(t.missionId, t.month, t.year),
    index("ActivityReport_userId_year_month_idx").on(t.userId, t.year, t.month),
  ],
);

export const reportEntries = sqliteTable(
  "ReportEntry",
  {
    id: cuid(),
    date: integer("date", { mode: "timestamp_ms" }).notNull(),
    value: real("value").notNull().default(0),
    note: text("note"),
    isWeekend: integer("isWeekend", { mode: "boolean" }).notNull().default(false),
    isHoliday: integer("isHoliday", { mode: "boolean" }).notNull().default(false),
    reportId: text("reportId")
      .notNull()
      .references(() => activityReports.id, { onDelete: "cascade" }),
  },
  (t) => [unique("ReportEntry_reportId_date_key").on(t.reportId, t.date)],
);
