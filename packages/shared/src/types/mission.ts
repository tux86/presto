import type { ClientColorKey } from "../colors.js";
import type { CurrencyCode } from "../currencies.js";

export interface Mission {
  id: string;
  name: string;
  clientId: string;
  companyId: string;
  userId: string;
  dailyRate: number | null;
  startDate: string | null;
  endDate: string | null;
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
}

export interface UpdateMissionRequest {
  name?: string;
  clientId?: string;
  companyId?: string;
  dailyRate?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}
