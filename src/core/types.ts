/** Domain types. Pure data — no persistence or transport concerns. */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export const REPORT_STATUSES = ["draft", "completed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** A day is worked fully, by half, or not at all. */
export const DAY_VALUES = [0, 0.5, 1] as const;
export type DayValue = (typeof DAY_VALUES)[number];

export function isDayValue(v: unknown): v is DayValue {
  return v === 0 || v === 0.5 || v === 1;
}

export const CLIENT_COLORS = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
  "slate",
  "zinc",
] as const;
export type ClientColor = (typeof CLIENT_COLORS)[number];

export interface Company {
  id: string;
  name: string;
  address: string | null;
  businessId: string | null;
  isDefault: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessId: string | null;
  color: ClientColor | null;
  currency: string;
  holidayCountry: string;
}

export interface Mission {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
  dailyRate: number | null;
  /** ISO date (YYYY-MM-DD) or null. */
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

/**
 * A month of work for one mission.
 *
 * `days` and `dayNotes` are sparse maps keyed by day-of-month ("1".."31").
 * Zero-valued days are omitted. Weekend and holiday flags are NOT stored —
 * they are derived from (date, holidayCountry) on read. See `buildMonthGrid`.
 */
export interface Report {
  id: string;
  missionId: string;
  year: number;
  month: number;
  status: ReportStatus;
  /** Rate snapshot taken at creation, so historical reports survive rate changes. */
  dailyRate: number | null;
  holidayCountry: string;
  days: Record<string, DayValue>;
  dayNotes: Record<string, string>;
  /** Printed on the PDF the client receives. */
  note: string | null;
  /** Never leaves this machine. */
  privateNote: string | null;
}

/** A report joined with the mission, client and company it belongs to. */
export interface ReportContext {
  report: Report;
  mission: Mission;
  client: Client;
  company: Company;
}
