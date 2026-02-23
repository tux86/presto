import type { HolidayCountryCode } from "../countries.js";
import type { CurrencyCode } from "../currencies.js";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessId: string | null;
  currency: CurrencyCode;
  holidayCountry: HolidayCountryCode;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  businessId?: string;
  currency: CurrencyCode;
  holidayCountry: HolidayCountryCode;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessId?: string | null;
  currency?: CurrencyCode;
  holidayCountry?: HolidayCountryCode;
}
