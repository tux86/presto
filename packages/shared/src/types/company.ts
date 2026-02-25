export interface Company {
  id: string;
  name: string;
  address: string | null;
  businessId: string | null;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  address?: string;
  businessId?: string;
  isDefault?: boolean;
}

export interface UpdateCompanyRequest {
  name?: string;
  address?: string | null;
  businessId?: string | null;
  isDefault?: boolean;
}
