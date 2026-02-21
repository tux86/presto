import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

const { holidayCountry, locale } = config.app;

/** Minimal shape required by enrichReport: a report with entries containing date + isHoliday. */
interface ReportLike {
  entries: Array<{ date: Date | string; isHoliday: boolean }>;
}

/** Adds `holidayName` to each entry of a report. */
type Enriched<T extends ReportLike> = Omit<T, "entries"> & {
  entries: Array<T["entries"][number] & { holidayName: string | null }>;
};

/**
 * Enrich report entries with computed holidayName based on date and configured locale.
 * Handles single reports, arrays of reports, or null.
 */
export function enrichReport<T extends ReportLike>(report: T[]): Enriched<T>[];
export function enrichReport<T extends ReportLike>(report: T): Enriched<T>;
export function enrichReport<T extends ReportLike>(report: T | null): Enriched<T> | null;
export function enrichReport<T extends ReportLike>(report: T | T[] | null): Enriched<T> | Enriched<T>[] | null {
  if (!report) return null;
  if (Array.isArray(report)) return report.map((r) => enrichReport(r));
  return {
    ...report,
    entries: report.entries.map((entry) => ({
      ...entry,
      holidayName: entry.isHoliday ? getHolidayName(new Date(entry.date), holidayCountry, locale) : null,
    })),
  };
}

export async function createReportWithEntries(userId: string, missionId: string, month: number, year: number) {
  const dates = getMonthDates(year, month);

  const report = await prisma.activityReport.create({
    data: {
      month,
      year,
      userId,
      missionId,
      entries: {
        create: dates.map((date) => ({
          date,
          value: 0,
          isWeekend: isWeekend(date),
          isHoliday: !!getHolidayName(date, holidayCountry),
        })),
      },
    },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  return enrichReport(report);
}

export async function autoFillReport(reportId: string) {
  await prisma.reportEntry.updateMany({
    where: {
      reportId,
      isWeekend: false,
      isHoliday: false,
    },
    data: { value: 1 },
  });

  await recalculateTotalDays(reportId);
}

export async function clearReport(reportId: string) {
  await prisma.$transaction([
    prisma.reportEntry.updateMany({
      where: { reportId },
      data: { value: 0, task: null },
    }),
    prisma.activityReport.update({
      where: { id: reportId },
      data: { totalDays: 0 },
    }),
  ]);
}

export async function recalculateTotalDays(reportId: string) {
  const result = await prisma.reportEntry.aggregate({
    where: { reportId },
    _sum: { value: true },
  });
  const total = result._sum.value ?? 0;
  await prisma.activityReport.update({
    where: { id: reportId },
    data: { totalDays: total },
  });
  return total;
}
