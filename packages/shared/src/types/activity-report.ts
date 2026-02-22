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

import type { CurrencyCode } from "../currencies.js";

export interface ActivityReport {
  id: string;
  month: number;
  year: number;
  status: ReportStatus;
  totalDays: number;
  note: string | null;
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
      currency: CurrencyCode;
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
  note?: string;
}

export interface UpdateEntriesRequest {
  entries: {
    id: string;
    value?: number;
    note?: string;
  }[];
}

export interface ReportingData {
  year: number;
  totalDays: number;
  totalRevenue: number;
  averageDailyRate: number;
  monthlyData: {
    month: number;
    days: number;
    revenue: number;
  }[];
  clientData: {
    clientId: string;
    clientName: string;
    currency: CurrencyCode;
    days: number;
    revenue: number;
  }[];
}
