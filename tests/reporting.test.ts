import { describe, expect, test } from "bun:test";
import { forCountry } from "../src/core/holidays.ts";
import { averageRate, effectiveRate, summarizeYear, workdaysInYear } from "../src/core/reporting.ts";
import { context, fullDays } from "./fixtures.ts";

const FR = forCountry("FR");

describe("effectiveRate", () => {
  test("prefers the report's snapshot over the mission's current rate", () => {
    expect(effectiveRate(context({ report: { dailyRate: 700 }, mission: { dailyRate: 650 } }))).toBe(700);
  });

  test("falls back to the mission when the report has no snapshot", () => {
    expect(effectiveRate(context({ report: { dailyRate: null }, mission: { dailyRate: 650 } }))).toBe(650);
  });

  test("is null when neither has a rate", () => {
    expect(effectiveRate(context({ report: { dailyRate: null }, mission: { dailyRate: null } }))).toBeNull();
  });
});

describe("workdaysInYear", () => {
  test("counts weekdays minus that country's public holidays", () => {
    expect(workdaysInYear(2026, FR)).toBe(252);
    expect(workdaysInYear(2026)).toBe(261); // weekdays only
    expect(workdaysInYear(2026, FR)).toBeLessThan(workdaysInYear(2026));
  });
});

describe("summarizeYear", () => {
  test("an empty year produces zeroes, not undefined", () => {
    const s = summarizeYear(2026, []);
    expect(s.totalDays).toBe(0);
    expect(s.currencies).toEqual([]);
    expect(s.months).toHaveLength(12);
    expect(s.months[0]!.days).toBe(0);
    expect(s.previous).toBeNull();
  });

  test("aggregates days and revenue", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(20) } }),
      context({ report: { id: "b", month: 2, days: fullDays(18) } }),
    ]);
    expect(s.totalDays).toBe(38);
    expect(s.byCurrency.EUR).toEqual({ revenue: 24700, days: 38 });
    expect(s.months[0]!.days).toBe(20);
    expect(s.months[0]!.revenue.EUR).toBe(13000);
    expect(s.months[2]!.days).toBe(0);
  });

  test("keeps currencies separate instead of converting them", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10) } }),
      context({
        report: { id: "b", month: 1, days: fullDays(10), dailyRate: 800 },
        client: { id: "cl2", name: "Initech", currency: "USD" },
        mission: { id: "m2", clientId: "cl2" },
      }),
    ]);
    expect(s.byCurrency.EUR!.revenue).toBe(6500);
    expect(s.byCurrency.USD!.revenue).toBe(8000);
    expect(s.months[0]!.revenue).toEqual({ EUR: 6500, USD: 8000 });
    // Ordered by revenue, highest first.
    expect(s.currencies).toEqual(["USD", "EUR"]);
    expect(s.totalDays).toBe(20);
  });

  test("compares only the elapsed months when the year is still running", () => {
    const lastYear = [
      context({ report: { id: "p1", year: 2025, month: 1, days: fullDays(20) } }),
      context({ report: { id: "p2", year: 2025, month: 8, days: fullDays(20) } }),
    ];

    // A finished year is compared against all twelve months.
    expect(summarizeYear(2026, [], lastYear).previous).toMatchObject({ totalDays: 40, partial: false });

    // A year in progress is compared against the same months only, so eight
    // months of work does not read as a collapse against a full twelve.
    expect(summarizeYear(2026, [], lastYear, { throughMonth: 3 }).previous).toMatchObject({
      totalDays: 20,
      partial: true,
    });
  });

  test("company rows are split by currency so days and revenue agree", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10) } }),
      context({
        report: { id: "b", month: 2, days: fullDays(10), dailyRate: 900 },
        client: { id: "cl2", name: "Helvetia", currency: "CHF" },
        mission: { id: "m2", clientId: "cl2" },
      }),
    ]);

    // One company, two currencies, two rows — never 20 days next to a
    // single-currency amount.
    expect(s.companies).toHaveLength(2);
    const eur = s.companies.find((c) => c.currency === "EUR")!;
    const chf = s.companies.find((c) => c.currency === "CHF")!;
    expect(eur).toMatchObject({ companyName: "Acme Consulting", days: 10, revenue: 6500 });
    expect(chf).toMatchObject({ companyName: "Acme Consulting", days: 10, revenue: 9000 });
  });

  test("splits a client billed through two of your companies", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10) } }),
      context({
        report: { id: "b", month: 2, days: fullDays(10) },
        mission: { id: "m2", companyId: "co2" },
        company: { id: "co2", name: "Second Entity", isDefault: false },
      }),
    ]);
    expect(s.clients).toHaveLength(2);
    expect(s.companies).toHaveLength(2);
    expect(s.clients.every((c) => c.clientName === "Globex")).toBe(true);
  });

  test("merges reports for the same client and company", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10) } }),
      context({ report: { id: "b", month: 2, days: fullDays(5) } }),
    ]);
    expect(s.clients).toHaveLength(1);
    expect(s.clients[0]!.days).toBe(15);
    expect(s.clients[0]!.revenue).toBe(9750);
  });

  test("treats a missing rate as zero revenue but still counts the days", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10), dailyRate: null }, mission: { dailyRate: null } }),
    ]);
    expect(s.totalDays).toBe(10);
    expect(s.byCurrency.EUR!.revenue).toBe(0);
  });

  test("summarizes the previous year for comparison", () => {
    const s = summarizeYear(
      2026,
      [context({ report: { id: "a", month: 1, days: fullDays(10) } })],
      [
        context({ report: { id: "p1", year: 2025, month: 1, days: fullDays(20) } }),
        context({
          report: { id: "p2", year: 2025, month: 2, days: fullDays(5) },
          client: { id: "cl2", name: "Initech" },
          mission: { id: "m2", clientId: "cl2" },
        }),
      ],
    );
    expect(s.previous).toEqual({ totalDays: 25, byCurrency: { EUR: 16250 }, clientCount: 2, partial: false });
  });

  test("half-days survive aggregation without float drift", () => {
    const s = summarizeYear(2026, [context({ report: { id: "a", month: 1, days: { "1": 0.5, "2": 0.5, "3": 0.5 } } })]);
    expect(s.totalDays).toBe(1.5);
    expect(s.byCurrency.EUR!.revenue).toBe(975);
  });
});

describe("averageRate", () => {
  test("divides revenue by days for one currency", () => {
    const s = summarizeYear(2026, [
      context({ report: { id: "a", month: 1, days: fullDays(10) } }),
      context({ report: { id: "b", month: 2, days: fullDays(10), dailyRate: 750 } }),
    ]);
    expect(averageRate(s, "EUR")).toBe(700);
  });

  test("is zero for a currency with no activity", () => {
    expect(averageRate(summarizeYear(2026, []), "EUR")).toBe(0);
  });
});
