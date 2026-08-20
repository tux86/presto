import Holidays from "date-holidays";
import type { Locale } from "./types.ts";

/**
 * Public-holiday lookup, wrapping `date-holidays`.
 *
 * Instances are cached because constructing one parses that country's whole
 * rule set, and the grid asks about 31 dates in a row for the same country.
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

/** Every country code `date-holidays` knows about (ISO 3166-1 alpha-2). */
export function holidayCountries(): string[] {
  return Object.keys(new Holidays().getCountries()).sort();
}

/** Localized country name, falling back to the raw code. */
export function countryName(code: string, locale: Locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for a two-letter country code. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
