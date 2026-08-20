import { describe, expect, test } from "bun:test";
import { utcDate } from "../src/core/dates.ts";
import { countryFlag, countryName, holidayCountries, holidayName, isHoliday } from "../src/core/holidays.ts";

describe("holidayName", () => {
  test("finds French public holidays", () => {
    expect(holidayName(utcDate(2026, 7, 14), "FR")).toBeTruthy();
    expect(holidayName(utcDate(2026, 5, 1), "FR")).toBeTruthy();
    expect(holidayName(utcDate(2026, 8, 15), "FR")).toBeTruthy();
  });

  test("returns null on ordinary days", () => {
    expect(holidayName(utcDate(2026, 8, 3), "FR")).toBeNull();
    expect(holidayName(utcDate(2026, 7, 15), "FR")).toBeNull();
  });

  test("is country-specific", () => {
    // 4 July is a holiday in the US and an ordinary day in France.
    expect(holidayName(utcDate(2026, 7, 4), "US")).toBeTruthy();
    expect(holidayName(utcDate(2026, 7, 4), "FR")).toBeNull();
    // 14 July is the reverse.
    expect(holidayName(utcDate(2026, 7, 14), "US")).toBeNull();
  });

  test("tracks moveable feasts", () => {
    // Easter Monday 2026 falls on 6 April.
    expect(holidayName(utcDate(2026, 4, 6), "FR")).toBeTruthy();
    expect(holidayName(utcDate(2025, 4, 21), "FR")).toBeTruthy();
  });

  test("localizes holiday names", () => {
    expect(holidayName(utcDate(2026, 12, 25), "FR", "fr")).toBe("Noël");
    expect(holidayName(utcDate(2026, 12, 25), "FR", "en")).toBe("Christmas Day");
  });

  test("isHoliday mirrors holidayName", () => {
    expect(isHoliday(utcDate(2026, 12, 25), "FR")).toBe(true);
    expect(isHoliday(utcDate(2026, 12, 26), "FR")).toBe(false);
  });
});

describe("country helpers", () => {
  test("lists countries including the common ones", () => {
    const countries = holidayCountries();
    expect(countries.length).toBeGreaterThan(100);
    expect(countries).toContain("FR");
    expect(countries).toContain("US");
    expect(countries).toContain("DE");
  });

  test("resolves localized country names", () => {
    expect(countryName("FR", "en")).toBe("France");
    expect(countryName("DE", "fr")).toBe("Allemagne");
  });

  test("builds flag emoji from country codes", () => {
    expect(countryFlag("FR")).toBe("🇫🇷");
    expect(countryFlag("us")).toBe("🇺🇸");
    expect(countryFlag("bogus")).toBe("");
  });
});
