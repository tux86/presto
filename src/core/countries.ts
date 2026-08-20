import type { Locale } from "./types.ts";

/**
 * Country display helpers. Intl only — deliberately free of the holiday
 * database, so the browser bundle does not pull in every country's rule set.
 */

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
