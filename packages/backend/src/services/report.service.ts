import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

const { holidayCountry, locale } = config.app;

/**
 * Enrich report entries with computed holidayName based on date and configured locale.
 * Handles single reports, arrays of reports, or null.
 */
// biome-ignore lint/suspicious/noExplicitAny: Prisma types are complex
export function enrichReport(report: any): any {
  if (!report) return report;
  if (Array.isArray(report)) return report.map(enrichReport);
  if (report.entries) {
    return {
      ...report,
      // biome-ignore lint/suspicious/noExplicitAny: Prisma entry type
      entries: report.entries.map((entry: any) => ({
        ...entry,
        holidayName: entry.isHoliday ? getHolidayName(new Date(entry.date), holidayCountry, locale) : null,
      })),
    };
  }
  return report;
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
  // Set all working days (not weekend, not holiday) to 1
  await prisma.reportEntry.updateMany({
    where: {
      reportId,
      isWeekend: false,
      isHoliday: false,
    },
    data: { value: 1 },
  });

  // Recalculate total
  await recalculateTotalDays(reportId);
}

export async function clearReport(reportId: string) {
  await prisma.reportEntry.updateMany({
    where: { reportId },
    data: { value: 0, task: null },
  });

  await prisma.activityReport.update({
    where: { id: reportId },
    data: { totalDays: 0 },
  });
}

export async function recalculateTotalDays(reportId: string) {
  const entries = await prisma.reportEntry.findMany({ where: { reportId } });
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  await prisma.activityReport.update({
    where: { id: reportId },
    data: { totalDays: total },
  });
  return total;
}
