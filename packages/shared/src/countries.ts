import Holidays from "date-holidays";

/** All holiday country codes supported by the date-holidays library (ISO 3166-1 alpha-2). */
export const HOLIDAY_COUNTRIES = Object.keys(new Holidays().getCountries()).sort() as [string, ...string[]];

export type HolidayCountryCode = string;

/** Get country display name (e.g. "France", "United States"). */
export function getCountryName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Get country flag emoji from ISO 3166-1 alpha-2 code. */
export function getCountryFlag(code: string): string {
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

/** Get formatted label: "🇫🇷 FR — France". */
export function getCountryLabel(code: string, locale = "en"): string {
  const flag = getCountryFlag(code);
  const name = getCountryName(code, locale);
  return `${flag} ${code} — ${name}`;
}
