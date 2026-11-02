import { buildMonthGrid, type Day, isWorkday } from "./grid.ts";
import type { DayValue, HolidayLookup, Report } from "./types.ts";

/** Days billed in a month. Halves count as 0.5. */
export function totalDays(days: Record<string, DayValue>): number {
  let total = 0;
  for (const value of Object.values(days)) total += value;
  // Values are multiples of 0.5, so one decimal is exact and kills float drift.
  return Math.round(total * 2) / 2;
}

export function reportTotal(report: Report): number {
  return totalDays(report.days);
}

/** Days in the month that are neither weekend nor public holiday. */
export function workdayCount(year: number, month: number, holidays: HolidayLookup): number {
  return buildMonthGrid(year, month, holidays).filter(isWorkday).length;
}

export function gridWorkdayCount(grid: Day[]): number {
  return grid.filter(isWorkday).length;
}

/**
 * Billable amount, or null when the mission has no rate. Rounded to the cent,
 * half up: 16.5 × 660.25 = 10894.125 bills 10894.13.
 */
export function revenue(days: number, dailyRate: number | null | undefined): number | null {
  if (dailyRate == null) return null;
  // Float multiplication lands a half cent just below .5 (16.5 × 0.29 × 100 is
  // 478.49999999999994), which would round down. Trim that noise first.
  return Math.round(Number((days * dailyRate * 100).toFixed(6))) / 100;
}

/** Share of the month's workdays that have been filled in, 0–100. */
export function completionPercent(days: number, workdays: number): number {
  if (workdays <= 0) return 0;
  return Math.min(100, Math.round((days / workdays) * 100));
}
