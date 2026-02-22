import type { CurrencyCode } from "../currencies.js";

export interface Mission {
  id: string;
  name: string;
  clientId: string;
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
    currency: CurrencyCode;
  };
}

export interface CreateMissionRequest {
  name: string;
  clientId: string;
  dailyRate?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateMissionRequest {
  name?: string;
  clientId?: string;
  dailyRate?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}
