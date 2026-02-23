export type ThemeMode = "light" | "dark" | "auto";

export interface UserSettings {
  userId: string;
  theme: ThemeMode;
  locale: string;
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
  settings?: UserSettings;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
