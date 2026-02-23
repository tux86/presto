import { getHolidayName, getMonthDates, isWeekend, type Locale } from "@presto/shared";
import { and, eq, sum } from "drizzle-orm";
import { insertReturning, REPORT_WITH } from "../db/helpers.js";
import { activityReports, db, reportEntries } from "../db/index.js";
import { config } from "../lib/config.js";

const defaultLocale: Locale = config.defaults.locale ?? "en";

/** Minimal shape required by enrichReport: a report with entries containing date + isHoliday. */
interface ReportLike {
  holidayCountry: string;
  entries: Array<{ date: Date | string; isHoliday: boolean }>;
}

/** Adds `holidayName` to each entry of a report. */
type Enriched<T extends ReportLike> = Omit<T, "entries"> & {
  entries: Array<T["entries"][number] & { holidayName: string | null }>;
};

/**
 * Enrich report entries with computed holidayName based on date and locale.
 * Handles single reports, arrays of reports, or null.
 */
export function enrichReport<T extends ReportLike>(report: T[], locale?: Locale): Enriched<T>[];
export function enrichReport<T extends ReportLike>(report: T, locale?: Locale): Enriched<T>;
export function enrichReport<T extends ReportLike>(report: T | null, locale?: Locale): Enriched<T> | null;
export function enrichReport<T extends ReportLike>(
  report: T | T[] | null,
  locale: Locale = defaultLocale,
): Enriched<T> | Enriched<T>[] | null {
  if (!report) return null;
  if (Array.isArray(report)) return report.map((r) => enrichReport(r, locale));
  return {
    ...report,
    entries: report.entries.map((entry) => ({
      ...entry,
      holidayName: entry.isHoliday ? getHolidayName(new Date(entry.date), report.holidayCountry, locale) : null,
    })),
  };
}

export async function createReportWithEntries(
  userId: string,
  missionId: string,
  month: number,
  year: number,
  holidayCountry: string,
  dailyRate?: number | null,
) {
  const dates = getMonthDates(year, month);

  // Insert report + entries atomically
  const report = await db.transaction(async (tx) => {
    const inserted = await insertReturning(
      activityReports,
      { month, year, userId, missionId, holidayCountry, dailyRate: dailyRate ?? null },
      tx as typeof db,
    );

    const entryValues = dates.map((date) => ({
      date,
      value: 0,
      isWeekend: isWeekend(date),
      isHoliday: !!getHolidayName(date, holidayCountry),
      reportId: inserted.id,
    }));

    await tx.insert(reportEntries).values(entryValues);
    return inserted;
  });

  // Relational query must run outside the transaction
  const result = await db.query.activityReports.findFirst({
    where: eq(activityReports.id, report.id),
    with: REPORT_WITH,
  });

  return enrichReport(result!);
}

export async function autoFillReport(reportId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(reportEntries)
      .set({ value: 1 })
      .where(
        and(
          eq(reportEntries.reportId, reportId),
          eq(reportEntries.isWeekend, false),
          eq(reportEntries.isHoliday, false),
        ),
      );

    const result = await tx
      .select({ total: sum(reportEntries.value) })
      .from(reportEntries)
      .where(eq(reportEntries.reportId, reportId));
    const total = Number(result[0]?.total) || 0;
    await tx
      .update(activityReports)
      .set({ totalDays: total, updatedAt: new Date() })
      .where(eq(activityReports.id, reportId));
  });
}

export async function clearReport(reportId: string) {
  await db.transaction(async (tx) => {
    await tx.update(reportEntries).set({ value: 0, note: null }).where(eq(reportEntries.reportId, reportId));
    await tx
      .update(activityReports)
      .set({ totalDays: 0, updatedAt: new Date() })
      .where(eq(activityReports.id, reportId));
  });
}

export async function recalculateTotalDays(reportId: string) {
  const result = await db
    .select({ total: sum(reportEntries.value) })
    .from(reportEntries)
    .where(eq(reportEntries.reportId, reportId));
  const total = Number(result[0]?.total) || 0;
  await db
    .update(activityReports)
    .set({ totalDays: total, updatedAt: new Date() })
    .where(eq(activityReports.id, reportId));
  return total;
}
