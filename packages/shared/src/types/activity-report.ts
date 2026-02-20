export type ReportStatus = "DRAFT" | "COMPLETED";

export interface ReportEntry {
  id: string;
  date: string;
  value: number; // 0, 0.5, 1
  task: string | null;
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
    task?: string;
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
    days: number;
    revenue: number;
  }[];
}
