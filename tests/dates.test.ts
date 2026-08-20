import { describe, expect, test } from "bun:test";
import {
  dayName,
  dayNameFull,
  daysInMonth,
  isoDate,
  isWeekend,
  monthDates,
  monthKey,
  monthName,
  utcDate,
  weekdayHeaders,
  weekdayIndex,
} from "../src/core/dates.ts";

describe("daysInMonth", () => {
  test("handles 31, 30 and 28 day months", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test("handles leap years, including the 400-year rule", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28); // divisible by 100, not 400
    expect(daysInMonth(2000, 2)).toBe(29); // divisible by 400
  });
});

describe("utcDate", () => {
  test("lands at noon UTC so the calendar day survives any timezone", () => {
    const d = utcDate(2026, 8, 3);
    expect(d.toISOString()).toBe("2026-08-03T12:00:00.000Z");
  });

  test("keeps the same date across inhabited timezones", () => {
    const d = utcDate(2026, 8, 3);
    for (const tz of ["Pacific/Midway", "America/New_York", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"]) {
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "2-digit" }).format(d);
      expect(day).toBe("03");
    }
  });

  test("normalizes month boundaries", () => {
    expect(isoDate(utcDate(2026, 12, 31))).toBe("2026-12-31");
    expect(isoDate(utcDate(2027, 1, 1))).toBe("2027-01-01");
  });
});

describe("monthDates", () => {
  test("covers every day of the month exactly once", () => {
    const dates = monthDates(2024, 2);
    expect(dates).toHaveLength(29);
    expect(isoDate(dates[0]!)).toBe("2024-02-01");
    expect(isoDate(dates[28]!)).toBe("2024-02-29");
  });

  test("does not spill into the next month", () => {
    for (const date of monthDates(2026, 4)) {
      expect(date.getUTCMonth()).toBe(3);
    }
  });
});

describe("weekends", () => {
  test("identifies Saturday and Sunday", () => {
    expect(isWeekend(utcDate(2026, 8, 1))).toBe(true); // Saturday
    expect(isWeekend(utcDate(2026, 8, 2))).toBe(true); // Sunday
    expect(isWeekend(utcDate(2026, 8, 3))).toBe(false); // Monday
    expect(isWeekend(utcDate(2026, 8, 7))).toBe(false); // Friday
  });

  test("weekdayIndex is Monday-based", () => {
    expect(weekdayIndex(utcDate(2026, 8, 3))).toBe(0); // Monday
    expect(weekdayIndex(utcDate(2026, 8, 9))).toBe(6); // Sunday
  });
});

describe("formatting", () => {
  test("month names are localized and capitalized", () => {
    expect(monthName(8, "en")).toBe("August");
    expect(monthName(8, "fr")).toBe("Août");
    expect(monthName(1, "fr")).toBe("Janvier");
  });

  test("day names are localized", () => {
    const monday = utcDate(2026, 8, 3);
    expect(dayName(monday, "en")).toBe("Mon");
    expect(dayNameFull(monday, "en")).toBe("Monday");
    expect(dayNameFull(monday, "fr")).toBe("Lundi");
  });

  test("weekday headers start on Monday", () => {
    expect(weekdayHeaders("en")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  test("monthKey is zero-padded and sorts chronologically", () => {
    expect(monthKey(2026, 8)).toBe("2026-08");
    expect(["2026-10", "2026-02"].sort()).toEqual(["2026-02", "2026-10"]);
  });
});
