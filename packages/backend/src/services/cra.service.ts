import { prisma } from "../lib/prisma.js";
import { getMonthDates } from "@presto/shared";
import { isWeekend, getHolidayName } from "@presto/shared";

export async function createCraWithEntries(
  userId: string,
  missionId: string,
  month: number,
  year: number
) {
  const dates = getMonthDates(year, month);

  const cra = await prisma.cra.create({
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

  return cra;
}

export async function autoFillCra(craId: string) {
  // Set all working days (not weekend, not holiday) to 1
  await prisma.craEntry.updateMany({
    where: {
      craId,
      isWeekend: false,
      isHoliday: false,
    },
    data: { value: 1 },
  });

  // Recalculate total
  await recalculateTotalDays(craId);
}

export async function clearCra(craId: string) {
  await prisma.craEntry.updateMany({
    where: { craId },
    data: { value: 0, task: null },
  });

  await prisma.cra.update({
    where: { id: craId },
    data: { totalDays: 0 },
  });
}

export async function recalculateTotalDays(craId: string) {
  const entries = await prisma.craEntry.findMany({ where: { craId } });
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  await prisma.cra.update({
    where: { id: craId },
    data: { totalDays: total },
  });
  return total;
}
