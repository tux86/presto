import { daysInMonth, isWeekend, utcDate } from "./dates.ts";
import { isHoliday } from "./holidays.ts";
import { reportTotal, revenue } from "./totals.ts";
import type { ClientColor, ReportContext } from "./types.ts";

/**
 * Yearly aggregation.
 *
 * Revenue is never converted between currencies. Amounts are grouped by the
 * currency they were billed in, and the UI picks one to chart. Inventing an
 * exchange rate would make the numbers look authoritative when they are not.
 */
export interface YearSummary {
  year: number;
  totalDays: number;
  workdaysInYear: number;
  /** Currencies present this year, highest revenue first. */
  currencies: string[];
  /** Revenue and days per currency. */
  byCurrency: Record<string, { revenue: number; days: number }>;
  months: MonthSummary[];
  clients: ClientSummary[];
  companies: CompanySummary[];
  previous: PreviousYear | null;
}

export interface MonthSummary {
  month: number;
  days: number;
  /** Revenue per currency for this month. */
  revenue: Record<string, number>;
}

export interface ClientSummary {
  clientId: string;
  clientName: string;
  color: ClientColor | null;
  currency: string;
  days: number;
  revenue: number;
}

export interface CompanySummary {
  companyId: string;
  companyName: string;
  days: number;
  revenue: Record<string, number>;
}

export interface PreviousYear {
  totalDays: number;
  byCurrency: Record<string, number>;
  clientCount: number;
}

function add(map: Record<string, number>, key: string, amount: number): void {
  map[key] = (map[key] ?? 0) + amount;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Effective daily rate: the report's snapshot, falling back to the mission's. */
export function effectiveRate(ctx: ReportContext): number | null {
  return ctx.report.dailyRate ?? ctx.mission.dailyRate;
}

/**
 * Working days in a year, excluding weekends and public holidays.
 * The holiday calendar is the one used by most of the year's reports.
 */
export function workdaysInYear(year: number, country: string | null): number {
  let count = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const date = utcDate(year, month, day);
      if (isWeekend(date)) continue;
      if (country && isHoliday(date, country)) continue;
      count++;
    }
  }
  return count;
}

/** The holiday country used by the most reports, or null when there are none. */
function dominantCountry(reports: ReportContext[]): string | null {
  const counts = new Map<string, number>();
  for (const { report } of reports) {
    counts.set(report.holidayCountry, (counts.get(report.holidayCountry) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [country, count] of counts) {
    if (count > max) {
      best = country;
      max = count;
    }
  }
  return best;
}

function summarizePrevious(reports: ReportContext[]): PreviousYear | null {
  if (reports.length === 0) return null;
  const byCurrency: Record<string, number> = {};
  const clients = new Set<string>();
  let totalDays = 0;
  for (const ctx of reports) {
    const days = reportTotal(ctx.report);
    totalDays += days;
    clients.add(ctx.client.id);
    const amount = revenue(days, effectiveRate(ctx));
    if (amount !== null) add(byCurrency, ctx.client.currency, amount);
  }
  for (const key of Object.keys(byCurrency)) byCurrency[key] = round(byCurrency[key]!);
  return { totalDays, byCurrency, clientCount: clients.size };
}

/**
 * Build the yearly view from completed reports.
 * `previousReports` are last year's, used only for the year-over-year deltas.
 */
export function summarizeYear(
  year: number,
  reports: ReportContext[],
  previousReports: ReportContext[] = [],
): YearSummary {
  const byCurrency: Record<string, { revenue: number; days: number }> = {};
  const months: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    days: 0,
    revenue: {},
  }));
  const clients = new Map<string, ClientSummary>();
  const companies = new Map<string, CompanySummary>();
  let totalDays = 0;

  for (const ctx of reports) {
    const { report, client, company } = ctx;
    const days = reportTotal(report);
    const currency = client.currency;
    const amount = revenue(days, effectiveRate(ctx)) ?? 0;

    totalDays += days;

    byCurrency[currency] ??= { revenue: 0, days: 0 };
    const bucket = byCurrency[currency];
    bucket.revenue += amount;
    bucket.days += days;

    const month = months[report.month - 1];
    if (month) {
      month.days += days;
      add(month.revenue, currency, amount);
    }

    // Keyed by client + company: the same client billed through two of your
    // entities is two lines on the report, which is what an accountant wants.
    const clientKey = `${client.id}|${company.id}`;
    const clientRow = clients.get(clientKey) ?? {
      clientId: client.id,
      clientName: client.name,
      color: client.color,
      currency,
      days: 0,
      revenue: 0,
    };
    clientRow.days += days;
    clientRow.revenue += amount;
    clients.set(clientKey, clientRow);

    const companyRow = companies.get(company.id) ?? {
      companyId: company.id,
      companyName: company.name,
      days: 0,
      revenue: {},
    };
    companyRow.days += days;
    add(companyRow.revenue, currency, amount);
    companies.set(company.id, companyRow);
  }

  for (const bucket of Object.values(byCurrency)) bucket.revenue = round(bucket.revenue);
  for (const month of months) {
    month.days = Math.round(month.days * 2) / 2;
    for (const key of Object.keys(month.revenue)) month.revenue[key] = round(month.revenue[key]!);
  }
  for (const row of clients.values()) row.revenue = round(row.revenue);
  for (const row of companies.values()) {
    for (const key of Object.keys(row.revenue)) row.revenue[key] = round(row.revenue[key]!);
  }

  const currencies = Object.keys(byCurrency).sort(
    (a, b) => (byCurrency[b]?.revenue ?? 0) - (byCurrency[a]?.revenue ?? 0) || a.localeCompare(b),
  );

  return {
    year,
    totalDays: Math.round(totalDays * 2) / 2,
    workdaysInYear: workdaysInYear(year, dominantCountry(reports)),
    currencies,
    byCurrency,
    months,
    clients: [...clients.values()].sort((a, b) => b.revenue - a.revenue || a.clientName.localeCompare(b.clientName)),
    companies: [...companies.values()].sort((a, b) => b.days - a.days || a.companyName.localeCompare(b.companyName)),
    previous: summarizePrevious(previousReports),
  };
}

/** Average daily rate for one currency, or 0 when nothing was billed in it. */
export function averageRate(summary: YearSummary, currency: string): number {
  const bucket = summary.byCurrency[currency];
  if (!bucket || bucket.days === 0) return 0;
  return round(bucket.revenue / bucket.days);
}
