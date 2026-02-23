import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  datetime,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// Common column helpers
const cuid = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = () =>
  datetime("createdAt", { fsp: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  datetime("updatedAt", { fsp: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const users = mysqlTable("User", {
  id: cuid(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("firstName", { length: 200 }).notNull(),
  lastName: varchar("lastName", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userSettings = mysqlTable("UserSettings", {
  userId: varchar("userId", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 10 }).notNull().default("dark"),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  baseCurrency: varchar("baseCurrency", { length: 10 }).notNull().default("EUR"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const exchangeRates = mysqlTable("ExchangeRate", {
  currency: varchar("currency", { length: 10 }).primaryKey(),
  rate: double("rate").notNull(),
  updatedAt: datetime("updatedAt", { fsp: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const clients = mysqlTable(
  "Client",
  {
    id: cuid(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    businessId: varchar("businessId", { length: 100 }),
    color: varchar("color", { length: 20 }),
    currency: varchar("currency", { length: 10 }).notNull(),
    holidayCountry: varchar("holidayCountry", { length: 10 }).notNull(),
    userId: varchar("userId", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Client_userId_idx").on(t.userId)],
);

export const missions = mysqlTable(
  "Mission",
  {
    id: cuid(),
    name: varchar("name", { length: 200 }).notNull(),
    clientId: varchar("clientId", { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    userId: varchar("userId", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyRate: double("dailyRate"),
    startDate: datetime("startDate", { fsp: 3, mode: "date" }),
    endDate: datetime("endDate", { fsp: 3, mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Mission_userId_idx").on(t.userId), index("Mission_clientId_idx").on(t.clientId)],
);

export const activityReports = mysqlTable(
  "ActivityReport",
  {
    id: cuid(),
    month: int("month").notNull(),
    year: int("year").notNull(),
    status: mysqlEnum("status", ["DRAFT", "COMPLETED"]).notNull().default("DRAFT"),
    totalDays: double("totalDays").notNull().default(0),
    note: text("note"),
    holidayCountry: varchar("holidayCountry", { length: 10 }).notNull(),
    missionId: varchar("missionId", { length: 36 })
      .notNull()
      .references(() => missions.id, { onDelete: "restrict" }),
    userId: varchar("userId", { length: 36 })
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

export const reportEntries = mysqlTable(
  "ReportEntry",
  {
    id: cuid(),
    date: datetime("date", { fsp: 3, mode: "date" }).notNull(),
    value: double("value").notNull().default(0),
    note: text("note"),
    isWeekend: boolean("isWeekend").notNull().default(false),
    isHoliday: boolean("isHoliday").notNull().default(false),
    reportId: varchar("reportId", { length: 36 })
      .notNull()
      .references(() => activityReports.id, { onDelete: "cascade" }),
  },
  (t) => [unique("ReportEntry_reportId_date_key").on(t.reportId, t.date)],
);
