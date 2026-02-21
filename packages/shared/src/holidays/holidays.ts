import Holidays from "date-holidays";

const instanceCache = new Map<string, Holidays>();

function getInstance(country: string, locale?: string): Holidays {
  const key = `${country}:${locale ?? ""}`;
  let hd = instanceCache.get(key);
  if (!hd) {
    hd = new Holidays(country);
    if (locale) {
      hd.setLanguages(locale);
    }
    instanceCache.set(key, hd);
  }
  return hd;
}

/**
 * Check if a date is a public holiday, returns the holiday name or null
 */
export function getHolidayName(date: Date, country = "FR", locale?: string): string | null {
  const hd = getInstance(country, locale);
  const result = hd.isHoliday(date);
  if (!result) return null;
  const publicHoliday = result.find((h) => h.type === "public");
  return publicHoliday?.name ?? null;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
