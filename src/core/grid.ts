import { dayName, isoDate, isWeekend, monthDates, weekdayIndex } from "./dates.ts";
import type { DayValue, HolidayLookup, Locale, Report } from "./types.ts";

/** One calendar day, with everything the UI and the PDF need to render it. */
export interface Day {
  /** Day of month, 1-indexed. */
  day: number;
  date: Date;
  iso: string;
  /** Monday-based: Mon=0 … Sun=6. */
  weekday: number;
  label: string;
  isWeekend: boolean;
  /** Public-holiday name, or null. */
  holiday: string | null;
  value: DayValue;
  note: string;
}

/** A day counts toward expected workload unless it is a weekend or a holiday. */
export function isWorkday(day: Pick<Day, "isWeekend" | "holiday">): boolean {
  return !day.isWeekend && day.holiday === null;
}

/**
 * Expand a report's sparse day map into the full calendar month.
 *
 * Weekend and holiday flags are computed here rather than stored, so changing
 * a client's holiday country immediately corrects every report that uses it.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  holidays: HolidayLookup,
  days: Record<string, DayValue> = {},
  dayNotes: Record<string, string> = {},
  locale?: Locale,
): Day[] {
  return monthDates(year, month).map((date) => {
    const day = date.getUTCDate();
    const key = String(day);
    const iso = isoDate(date);
    return {
      day,
      date,
      iso,
      weekday: weekdayIndex(date),
      label: dayName(date, locale),
      isWeekend: isWeekend(date),
      holiday: holidays(iso),
      value: days[key] ?? 0,
      note: dayNotes[key] ?? "",
    };
  });
}

export function reportGrid(report: Report, holidays: HolidayLookup, locale?: Locale): Day[] {
  return buildMonthGrid(report.year, report.month, holidays, report.days, report.dayNotes, locale);
}

/** Drop zero values and empty notes so the stored maps stay sparse. */
export function compactDays(days: Record<string, DayValue>): Record<string, DayValue> {
  const out: Record<string, DayValue> = {};
  for (const [key, value] of Object.entries(days)) {
    if (value > 0) out[key] = value;
  }
  return out;
}

export function compactNotes(notes: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, note] of Object.entries(notes)) {
    const trimmed = note.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

/** Every workday in the month set to a full day. Weekends and holidays stay empty. */
export function fillWorkdays(year: number, month: number, holidays: HolidayLookup): Record<string, DayValue> {
  const out: Record<string, DayValue> = {};
  for (const day of buildMonthGrid(year, month, holidays)) {
    if (isWorkday(day)) out[String(day.day)] = 1;
  }
  return out;
}

/**
 * Carry a month's working rhythm into another month.
 *
 * Copies *which weekdays* were worked — and how much — rather than which dates,
 * because the two months have different weekends and holidays. A weekday worked
 * inconsistently in the source month uses its most common non-zero value.
 */
export function copyWeekdayPattern(
  source: Day[],
  year: number,
  month: number,
  holidays: HolidayLookup,
): Record<string, DayValue> {
  const byWeekday = new Map<number, Map<DayValue, number>>();
  for (const day of source) {
    if (day.value === 0) continue;
    const counts = byWeekday.get(day.weekday) ?? new Map<DayValue, number>();
    counts.set(day.value, (counts.get(day.value) ?? 0) + 1);
    byWeekday.set(day.weekday, counts);
  }

  const pattern = new Map<number, DayValue>();
  for (const [weekday, counts] of byWeekday) {
    let best: DayValue = 1;
    let bestCount = 0;
    for (const [value, count] of counts) {
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    }
    pattern.set(weekday, best);
  }

  const out: Record<string, DayValue> = {};
  for (const day of buildMonthGrid(year, month, holidays)) {
    if (!isWorkday(day)) continue;
    const value = pattern.get(day.weekday);
    if (value) out[String(day.day)] = value;
  }
  return out;
}
