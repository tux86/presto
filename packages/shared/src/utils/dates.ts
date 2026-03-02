/**
 * Create a timezone-safe UTC date at noon to avoid day-shift across timezones.
 */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Get number of days in a given month (1-indexed)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Generate all dates for a given month
 */
export function getMonthDates(year: number, month: number): Date[] {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => utcDate(year, month, i + 1));
}

export const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "pt"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Type guard: checks if a string is a supported locale. */
export function isLocale(s: string | undefined): s is Locale {
  return !!s && (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

export const localeMap: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  pt: "pt-PT",
};

function resolveLocale(locale?: string): string {
  return localeMap[(locale ?? "en") as Locale] ?? "en-US";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(date: Date, locale: string | undefined, options: Intl.DateTimeFormatOptions): string {
  const name = new Intl.DateTimeFormat(resolveLocale(locale), { ...options, timeZone: "UTC" }).format(date);
  return capitalize(name.replace(/\.$/, ""));
}

/**
 * Get month name (capitalized)
 */
export function getMonthName(month: number, locale?: string): string {
  return formatDate(utcDate(2000, month, 1), locale, { month: "long" });
}

/**
 * Get day name (short, 3 chars)
 */
export function getDayName(date: Date, locale?: string): string {
  return formatDate(date, locale, { weekday: "short" });
}

/**
 * Get day name (full)
 */
export function getDayNameFull(date: Date, locale?: string): string {
  return formatDate(date, locale, { weekday: "long" });
}

/**
 * Check if date falls on a weekend (Sat/Sun)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Count working days (Mon-Fri minus public holidays) in a given year.
 * Accepts an optional isHoliday predicate to avoid coupling to the date-holidays library.
 */
export function getWorkingDaysInYear(year: number, isHoliday?: (date: Date) => boolean): number {
  let count = 0;
  for (let m = 1; m <= 12; m++) {
    const days = getDaysInMonth(year, m);
    for (let d = 1; d <= days; d++) {
      const date = utcDate(year, m, d);
      if (isWeekend(date)) continue;
      if (isHoliday?.(date)) continue;
      count++;
    }
  }
  return count;
}
