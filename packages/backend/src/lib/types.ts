import type { Hono } from "hono";
import type { Prisma } from "../../prisma/generated/prisma/client.js";
import type { REPORT_INCLUDE, REPORT_INCLUDE_PDF } from "./helpers.js";

export type AppEnv = {
  Variables: {
    userId: string;
    userEmail: string;
  };
};

export type AppType = Hono<AppEnv>;

/** Activity report with entries + mission + client (standard query shape). */
export type ReportWithIncludes = Prisma.ActivityReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

/** Activity report with entries + mission + full client + user (PDF export shape). */
export type ReportWithIncludesPdf = Prisma.ActivityReportGetPayload<{ include: typeof REPORT_INCLUDE_PDF }>;

/** A report entry with the computed `holidayName` field added. */
export type EnrichedEntry = ReportWithIncludes["entries"][number] & { holidayName: string | null };

/** A report with enriched entries (holidayName computed). */
export type EnrichedReport = Omit<ReportWithIncludes, "entries"> & { entries: EnrichedEntry[] };
