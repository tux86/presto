import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthResponse } from "@presto/shared";
import { api } from "../api/client";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    company?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post<AuthResponse>("/auth/login", {
          email,
          password,
        });
        set({ token: res.token, user: res.user, isAuthenticated: true });
      },

      register: async (data) => {
        const res = await api.post<AuthResponse>("/auth/register", data);
        set({ token: res.token, user: res.user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const user = await api.get<User>("/auth/me");
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "presto-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
