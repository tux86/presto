export interface Client {
  id: string;
  name: string;
  businessId: string | null;
  email: string | null;
  address: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  businessId?: string;
  email?: string;
  address?: string;
}

export interface UpdateClientRequest {
  name?: string;
  businessId?: string;
  email?: string;
  address?: string;
}
