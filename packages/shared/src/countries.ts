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
