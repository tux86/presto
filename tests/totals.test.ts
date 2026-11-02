import { describe, expect, test } from "bun:test";
import { fillWorkdays } from "../src/core/grid.ts";
import { forCountry } from "../src/core/holidays.ts";

const FR = forCountry("FR");
const US = forCountry("US");
const DE = forCountry("DE");

import { completionPercent, revenue, totalDays, workdayCount } from "../src/core/totals.ts";

describe("totalDays", () => {
  test("sums full and half days", () => {
    expect(totalDays({ "1": 1, "2": 1, "3": 0.5 })).toBe(2.5);
  });

  test("an empty month is zero", () => {
    expect(totalDays({})).toBe(0);
  });

  test("does not accumulate floating point drift", () => {
    const days = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [String(i + 1), 0.5 as const]));
    expect(totalDays(days)).toBe(10.5);
  });

  test("counts holidays that were actually worked", () => {
    // The day map is the source of truth; a worked holiday still bills.
    expect(totalDays({ "14": 1 })).toBe(1);
  });
});

describe("workdayCount", () => {
  test("excludes weekends and public holidays", () => {
    // July 2026: 23 weekdays, minus Bastille Day on a Tuesday.
    expect(workdayCount(2026, 7, FR)).toBe(22);
  });

  test("differs by country for the same month", () => {
    // January 2026 has 22 weekdays. France loses New Year's Day; the US loses
    // that plus MLK Day. July 2026 is a wash: 4 July falls on a Saturday.
    expect(workdayCount(2026, 1, FR)).toBe(21);
    expect(workdayCount(2026, 1, US)).toBe(20);
    expect(workdayCount(2026, 7, DE)).toBe(23);
  });

  test("matches the number of days fillWorkdays sets", () => {
    for (const month of [1, 2, 5, 8, 12]) {
      expect(Object.keys(fillWorkdays(2026, month, FR))).toHaveLength(workdayCount(2026, month, FR));
    }
  });
});

describe("revenue", () => {
  test("multiplies days by the daily rate", () => {
    expect(revenue(20, 650)).toBe(13000);
    expect(revenue(20.5, 650)).toBe(13325);
  });

  test("is null when no rate is set", () => {
    expect(revenue(20, null)).toBeNull();
    expect(revenue(20, undefined)).toBeNull();
  });

  test("rounds to cents", () => {
    expect(revenue(1.5, 333.333)).toBe(500);
  });

  test("rounds a half cent up, despite float noise", () => {
    expect(revenue(16.5, 660.25)).toBe(10894.13);
    expect(revenue(16.5, 0.29)).toBe(4.79);
    // Every odd-cent rate up to 2000 on a half day: days × cents is exact in
    // integers, and half up is floor(x + 0.5).
    const wrong = [];
    for (let cents = 1; cents < 200_000; cents += 2) {
      if (revenue(0.5, cents / 100) !== Math.floor(0.5 * cents + 0.5) / 100) wrong.push(cents);
    }
    expect(wrong).toEqual([]);
  });

  test("zero days bills nothing", () => {
    expect(revenue(0, 650)).toBe(0);
  });
});

describe("completionPercent", () => {
  test("reports progress against the month's workdays", () => {
    expect(completionPercent(11, 22)).toBe(50);
    expect(completionPercent(22, 22)).toBe(100);
    expect(completionPercent(0, 22)).toBe(0);
  });

  test("caps at 100 when holidays were worked", () => {
    expect(completionPercent(25, 22)).toBe(100);
  });

  test("does not divide by zero", () => {
    expect(completionPercent(0, 0)).toBe(0);
  });
});
