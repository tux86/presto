import type { ClientColorKey } from "../colors.js";
import type { HolidayCountryCode } from "../countries.js";
import type { CurrencyCode } from "../currencies.js";

export const REPORT_STATUSES = ["DRAFT", "COMPLETED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportEntry {
  id: string;
  date: string;
  value: number; // 0, 0.5, 1
  note: string | null;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  reportId: string;
}

export interface ActivityReport {
  id: string;
  month: number;
  year: number;
  status: ReportStatus;
  totalDays: number;
  note: string | null;
  dailyRate: number | null;
  holidayCountry: HolidayCountryCode;
  missionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  entries?: ReportEntry[];
  mission?: {
    id: string;
    name: string;
    dailyRate: number | null;
    client: {
      id: string;
      name: string;
      color: ClientColorKey | null;
      currency: CurrencyCode;
      holidayCountry: HolidayCountryCode;
    };
    company: {
      id: string;
      name: string;
    };
  };
}

export interface CreateActivityReportRequest {
  month: number;
  year: number;
  missionId: string;
}

export interface UpdateActivityReportRequest {
  status?: ReportStatus;
  note?: string | null;
}

export interface UpdateEntriesRequest {
  entries: {
    id: string;
    value?: number;
    note?: string | null;
  }[];
}

export interface ReportingData {
  year: number;
  baseCurrency: string;
  totalDays: number;
  totalRevenue: number;
  averageDailyRate: number;
  workingDaysInYear: number;
  previousYear: {
    totalDays: number;
    totalRevenue: number;
    averageDailyRate: number;
    clientCount: number;
  } | null;
  monthlyData: {
    month: number;
    days: number;
    revenue: number;
  }[];
  monthlyClientRevenue: {
    month: number;
    clients: {
      clientId: string;
      clientName: string;
      clientColor: ClientColorKey | null;
      companyId: string;
      companyName: string;
      days: number;
      revenue: number;
    }[];
  }[];
  clientData: {
    clientId: string;
    clientName: string;
    clientColor: ClientColorKey | null;
    companyId: string;
    companyName: string;
    currency: CurrencyCode;
    days: number;
    revenue: number;
    convertedRevenue: number;
  }[];
  companyData: {
    companyId: string;
    companyName: string;
    days: number;
    convertedRevenue: number;
  }[];
}
