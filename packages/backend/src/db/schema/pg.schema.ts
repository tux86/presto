import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Common column helpers
const cuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

// $defaultFn generates timestamps in JS — works across all dialects at runtime.
const createdAt = () =>
  timestamp("createdAt", { precision: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  timestamp("updatedAt", { precision: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const reportStatusEnum = pgEnum("ReportStatus", ["DRAFT", "COMPLETED"]);

export const users = pgTable("User", {
  id: cuid(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  company: text("company"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const clients = pgTable(
  "Client",
  {
    id: cuid(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    businessId: text("businessId"),
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

export const missions = pgTable(
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
    dailyRate: doublePrecision("dailyRate"),
    startDate: timestamp("startDate", { precision: 3, mode: "date" }),
    endDate: timestamp("endDate", { precision: 3, mode: "date" }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Mission_userId_idx").on(t.userId), index("Mission_clientId_idx").on(t.clientId)],
);

export const activityReports = pgTable(
  "ActivityReport",
  {
    id: cuid(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    status: reportStatusEnum("status").notNull().default("DRAFT"),
    totalDays: doublePrecision("totalDays").notNull().default(0),
    note: text("note"),
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

export const reportEntries = pgTable(
  "ReportEntry",
  {
    id: cuid(),
    date: timestamp("date", { precision: 3, mode: "date" }).notNull(),
    value: doublePrecision("value").notNull().default(0),
    note: text("note"),
    isWeekend: boolean("isWeekend").notNull().default(false),
    isHoliday: boolean("isHoliday").notNull().default(false),
    reportId: text("reportId")
      .notNull()
      .references(() => activityReports.id, { onDelete: "cascade" }),
  },
  (t) => [unique("ReportEntry_reportId_date_key").on(t.reportId, t.date)],
);
