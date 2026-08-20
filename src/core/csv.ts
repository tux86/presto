import { monthName } from "./dates.ts";
import { effectiveRate } from "./reporting.ts";
import { reportTotal, revenue } from "./totals.ts";
import type { Locale, ReportContext } from "./types.ts";

const HEADERS = [
  "Year",
  "Month",
  "Month name",
  "Company",
  "Client",
  "Mission",
  "Status",
  "Days",
  "Daily rate",
  "Currency",
  "Revenue",
] as const;

/** RFC 4180 escaping: quote when the value contains a delimiter, quote or newline. */
function csvEscape(value: string | number | null): string {
  if (value === null) return "";
  const s = String(value);
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replaceAll('"', '""')}"`;
}

function row(cells: (string | number | null)[]): string {
  return cells.map(csvEscape).join(",");
}

/**
 * One row per report, ordered by month then client — the shape an accountant
 * or a spreadsheet expects. Excel needs the BOM to read UTF-8 correctly.
 */
export function reportsToCsv(reports: ReportContext[], locale: Locale = "en", bom = true): string {
  const sorted = [...reports].sort(
    (a, b) =>
      a.report.year - b.report.year ||
      a.report.month - b.report.month ||
      a.client.name.localeCompare(b.client.name) ||
      a.mission.name.localeCompare(b.mission.name),
  );

  const lines = [row([...HEADERS])];
  for (const ctx of sorted) {
    const days = reportTotal(ctx.report);
    const rate = effectiveRate(ctx);
    lines.push(
      row([
        ctx.report.year,
        ctx.report.month,
        monthName(ctx.report.month, locale),
        ctx.company.name,
        ctx.client.name,
        ctx.mission.name,
        ctx.report.status,
        days,
        rate,
        ctx.client.currency,
        revenue(days, rate),
      ]),
    );
  }

  return `${bom ? "﻿" : ""}${lines.join("\r\n")}\r\n`;
}
