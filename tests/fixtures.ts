import type { Client, Company, DayValue, Mission, Report, ReportContext } from "../src/core/types.ts";

export function company(over: Partial<Company> = {}): Company {
  return { id: "co1", name: "Acme Consulting", address: null, businessId: null, isDefault: true, ...over };
}

export function client(over: Partial<Client> = {}): Client {
  return {
    id: "cl1",
    name: "Globex",
    email: null,
    phone: null,
    address: null,
    businessId: null,
    color: "indigo",
    currency: "EUR",
    holidayCountry: "FR",
    ...over,
  };
}

export function mission(over: Partial<Mission> = {}): Mission {
  return {
    id: "m1",
    name: "API rewrite",
    clientId: "cl1",
    companyId: "co1",
    dailyRate: 650,
    startDate: null,
    endDate: null,
    isActive: true,
    ...over,
  };
}

export function report(over: Partial<Report> = {}): Report {
  return {
    id: "r1",
    missionId: "m1",
    year: 2026,
    month: 8,
    status: "completed",
    dailyRate: 650,
    holidayCountry: "FR",
    days: {},
    dayNotes: {},
    note: null,
    privateNote: null,
    ...over,
  };
}

/** Assemble a full report context, overriding any layer. */
export function context(
  over: {
    report?: Partial<Report>;
    mission?: Partial<Mission>;
    client?: Partial<Client>;
    company?: Partial<Company>;
  } = {},
): ReportContext {
  return {
    report: report(over.report),
    mission: mission(over.mission),
    client: client(over.client),
    company: company(over.company),
  };
}

/** A day map with `count` full days, starting at day 1. */
export function fullDays(count: number): Record<string, DayValue> {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i + 1), 1 as DayValue]));
}
