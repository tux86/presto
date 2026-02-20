export interface Client {
  id: string;
  name: string;
  siret: string | null;
  email: string | null;
  address: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  siret?: string;
  email?: string;
  address?: string;
}

export interface UpdateClientRequest {
  name?: string;
  siret?: string;
  email?: string;
  address?: string;
}
