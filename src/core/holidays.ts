import Holidays from "date-holidays";
import { daysInMonth, isoDate, utcDate } from "./dates.ts";
import type { HolidayLookup, Locale } from "./types.ts";

/**
 * Public-holiday rules, wrapping `date-holidays`.
 *
 * This module is the only thing that touches that library, and it runs on the
 * server. The browser receives a plain date-to-name map instead — the rule set
 * for every country is well over a megabyte.
 */
const cache = new Map<string, Holidays>();

function instance(country: string, locale?: Locale): Holidays {
  const key = `${country}:${locale ?? ""}`;
  let hd = cache.get(key);
  if (!hd) {
    hd = new Holidays(country);
    if (locale) hd.setLanguages(locale);
    cache.set(key, hd);
  }
  return hd;
}

/** The public-holiday name for a date, or null if it is an ordinary day. */
export function holidayName(date: Date, country: string, locale?: Locale): string | null {
  const result = instance(country, locale).isHoliday(date);
  if (!result) return null;
  return result.find((h) => h.type === "public")?.name ?? null;
}

export function isHoliday(date: Date, country: string): boolean {
  return holidayName(date, country) !== null;
}

/** A lookup for one country, suitable for `buildMonthGrid`. */
export function forCountry(country: string, locale?: Locale): HolidayLookup {
  return (iso) => {
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return null;
    return holidayName(utcDate(year, month, day), country, locale);
  };
}

/** Every public holiday in a year, as a date-to-name map the UI can carry. */
export function holidayMap(country: string, year: number, locale?: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const date = utcDate(year, month, day);
      const name = holidayName(date, country, locale);
      if (name) out[isoDate(date)] = name;
    }
  }
  return out;
}

/** Every country code `date-holidays` knows about (ISO 3166-1 alpha-2). */
export function holidayCountries(): string[] {
  return Object.keys(new Holidays().getCountries()).sort();
}
