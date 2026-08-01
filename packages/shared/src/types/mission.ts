import type { ClientColorKey } from "../colors.js";
import type { CurrencyCode } from "../currencies.js";

export interface MissionConsumption {
  missionId: string;
  missionName: string;
  clientId: string;
  plannedDays: number;
  daysWorked: number;
  isOverconsumed: boolean;
}

export interface Mission {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
  userId: string;
  dailyRate: number | null;
  startDate: string | null;
  endDate: string | null;
  allocatedDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    color: ClientColorKey | null;
    currency: CurrencyCode;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface CreateMissionRequest {
  name: string;
  clientId: string;
  companyId: string;
  dailyRate?: number;
  startDate?: string;
  endDate?: string;
  allocatedDays?: number;
}

export interface UpdateMissionRequest {
  name?: string;
  clientId?: string;
  companyId?: string;
  dailyRate?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  allocatedDays?: number | null;
  isActive?: boolean;
}
