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
 * Count weekdays (Mon-Fri) in a given year.
 */
export function getWorkingDaysInYear(year: number): number {
  let count = 0;
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, m, d).getDay();
      if (day !== 0 && day !== 6) count++;
    }
  }
  return count;
}
