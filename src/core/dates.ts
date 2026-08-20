import type { Locale } from "./types.ts";

/**
 * Build a UTC date at noon.
 *
 * Every read in this codebase goes through getUTC* or an Intl formatter pinned
 * to UTC, so the calendar day is already unambiguous. Noon (rather than
 * midnight) is belt-and-braces for anything that slips through and formats
 * locally: it holds for offsets UTC-12 through UTC+11:59, which covers every
 * inhabited timezone except Pacific/Kiritimati and friends.
 */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Number of days in a 1-indexed month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Every date in a 1-indexed month, as UTC-noon Dates. */
export function monthDates(year: number, month: number): Date[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => utcDate(year, month, i + 1));
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Monday-based weekday index: Mon=0 … Sun=6. */
export function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** ISO date string (YYYY-MM-DD) for a UTC date. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-08" — sortable and comparable as a plain string. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const INTL_LOCALES: Record<Locale, string> = { en: "en-US", fr: "fr-FR" };

function intlLocale(locale: Locale = "en"): string {
  return INTL_LOCALES[locale] ?? "en-US";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function format(date: Date, locale: Locale | undefined, options: Intl.DateTimeFormatOptions): string {
  const out = new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: "UTC" }).format(date);
  return capitalize(out.replace(/\.$/, ""));
}

/** Full month name, capitalized. */
export function monthName(month: number, locale?: Locale): string {
  return format(utcDate(2000, month, 1), locale, { month: "long" });
}

/**
 * Abbreviated month name for chart axes.
 * Not a truncation of the full name: in French that collapses "Juin" and
 * "Juillet" to the same three letters.
 */
export function monthShort(month: number, locale?: Locale): string {
  return format(utcDate(2000, month, 1), locale, { month: "short" });
}

/** Short weekday name (Mon, Lun…). */
export function dayName(date: Date, locale?: Locale): string {
  return format(date, locale, { weekday: "short" });
}

/** Full weekday name (Monday, Lundi…). */
export function dayNameFull(date: Date, locale?: Locale): string {
  return format(date, locale, { weekday: "long" });
}

/** Short weekday headers, Monday first. */
export function weekdayHeaders(locale?: Locale): string[] {
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => dayName(new Date(Date.UTC(2024, 0, 1 + i, 12)), locale));
}
