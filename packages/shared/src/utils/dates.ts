import { getHolidayName, isWeekend } from "../holidays/france.js";

/**
 * Get number of days in a given month (1-indexed)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate all dates for a given month
 */
export function getMonthDates(year: number, month: number): Date[] {
  const daysInMonth = getDaysInMonth(year, month);
  const dates: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month - 1, day));
  }
  return dates;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const localeMap: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
};

function resolveLocale(locale?: string): string {
  return localeMap[locale ?? "fr"] ?? "fr-FR";
}

/**
 * Get month name (capitalized)
 */
export function getMonthName(month: number, locale?: string): string {
  const date = new Date(2000, month - 1, 1);
  const name = new Intl.DateTimeFormat(resolveLocale(locale), { month: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Get day name (short, 3 chars)
 */
export function getDayName(date: Date, locale?: string): string {
  const name = new Intl.DateTimeFormat(resolveLocale(locale), { weekday: "short" }).format(date);
  // Capitalize first letter, remove trailing dot (French locale adds one)
  const clean = name.replace(/\.$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Get day name (full)
 */
export function getDayNameFull(date: Date, locale?: string): string {
  const name = new Intl.DateTimeFormat(resolveLocale(locale), { weekday: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Count working days in a month (excluding weekends and holidays)
 */
export function getWorkingDaysCount(year: number, month: number): number {
  const dates = getMonthDates(year, month);
  return dates.filter((d) => !isWeekend(d) && !getHolidayName(d)).length;
}
