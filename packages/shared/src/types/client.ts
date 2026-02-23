import type { ClientColorKey } from "../colors.js";
import type { HolidayCountryCode } from "../countries.js";
import type { CurrencyCode } from "../currencies.js";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessId: string | null;
  color: ClientColorKey | null;
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
  color?: ClientColorKey;
  currency: CurrencyCode;
  holidayCountry: HolidayCountryCode;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessId?: string | null;
  color?: ClientColorKey | null;
  currency?: CurrencyCode;
  holidayCountry?: HolidayCountryCode;
}
