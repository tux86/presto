export type CraStatus = "DRAFT" | "COMPLETED";

export interface CraEntry {
  id: string;
  date: string;
  value: number; // 0, 0.5, 1
  task: string | null;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  craId: string;
}

export interface Cra {
  id: string;
  month: number;
  year: number;
  status: CraStatus;
  totalDays: number;
  note: string | null;
  missionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  entries?: CraEntry[];
  mission?: {
    id: string;
    name: string;
    tjm: number | null;
    client: {
      id: string;
      name: string;
    };
  };
}

export interface CreateCraRequest {
  month: number;
  year: number;
  missionId: string;
}

export interface UpdateCraRequest {
  status?: CraStatus;
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
  averageTjm: number;
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
