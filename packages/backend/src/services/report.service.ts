import { prisma } from "../lib/prisma.js";
import { getMonthDates } from "@presto/shared";
import { isWeekend, getHolidayName } from "@presto/shared";

export async function createReportWithEntries(
  userId: string,
  missionId: string,
  month: number,
  year: number
) {
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
          isHoliday: !!getHolidayName(date),
          holidayName: getHolidayName(date),
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

  return report;
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
