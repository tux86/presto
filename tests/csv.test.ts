import { describe, expect, test } from "bun:test";
import { reportsToCsv } from "../src/core/csv.ts";
import { context, fullDays } from "./fixtures.ts";

const BOM = "﻿";

describe("reportsToCsv", () => {
  test("emits the exact expected document", () => {
    const csv = reportsToCsv(
      [
        context({ report: { id: "a", month: 2, days: fullDays(18) } }),
        context({ report: { id: "b", month: 1, days: fullDays(20) } }),
      ],
      "en",
    );
    expect(csv).toBe(
      [
        `${BOM}Year,Month,Month name,Company,Client,Mission,Status,Days,Daily rate,Currency,Revenue`,
        "2026,1,January,Acme Consulting,Globex,API rewrite,completed,20,650,EUR,13000",
        "2026,2,February,Acme Consulting,Globex,API rewrite,completed,18,650,EUR,11700",
        "",
      ].join("\r\n"),
    );
  });

  test("sorts by month, then client, then mission", () => {
    const csv = reportsToCsv([
      context({ report: { id: "a", month: 3 }, client: { name: "Zeta" } }),
      context({ report: { id: "b", month: 1 }, client: { name: "Beta" } }),
      context({ report: { id: "c", month: 1 }, client: { name: "Alpha" } }),
    ]);
    const clients = csv
      .trimEnd()
      .split("\r\n")
      .slice(1)
      .map((l) => l.split(",")[4]);
    expect(clients).toEqual(["Alpha", "Beta", "Zeta"]);
  });

  test("quotes fields containing commas, quotes or newlines", () => {
    const csv = reportsToCsv([
      context({
        client: { name: "Globex, Inc." },
        mission: { name: 'The "big" rewrite' },
        company: { name: "Line\nBreak" },
      }),
    ]);
    expect(csv).toContain('"Globex, Inc."');
    expect(csv).toContain('"The ""big"" rewrite"');
    expect(csv).toContain('"Line\nBreak"');
  });

  test("leaves rate and revenue blank when the mission has no rate", () => {
    const csv = reportsToCsv([
      context({ report: { days: fullDays(5), dailyRate: null }, mission: { dailyRate: null } }),
    ]);
    expect(csv.trimEnd().split("\r\n")[1]).toEndWith(",5,,EUR,");
  });

  test("localizes month names", () => {
    expect(reportsToCsv([context({ report: { month: 8 } })], "fr")).toContain(",Août,");
  });

  test("writes a header-only document for an empty year", () => {
    expect(reportsToCsv([])).toBe(
      `${BOM}Year,Month,Month name,Company,Client,Mission,Status,Days,Daily rate,Currency,Revenue\r\n`,
    );
  });

  test("can omit the Excel BOM", () => {
    expect(reportsToCsv([], "en", false).startsWith("Year,")).toBe(true);
  });
});
