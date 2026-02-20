export interface Mission {
  id: string;
  name: string;
  clientId: string;
  userId: string;
  tjm: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  };
}

export interface CreateMissionRequest {
  name: string;
  clientId: string;
  tjm?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateMissionRequest {
  name?: string;
  clientId?: string;
  tjm?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}
