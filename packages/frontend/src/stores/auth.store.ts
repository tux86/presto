import type { AuthResponse, User } from "@presto/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/api/client";
import { queryClient } from "@/lib/query-client";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
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
        queryClient.clear();
      },

      fetchMe: async () => {
        try {
          const user = await api.get<User>("/auth/me");
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (data) => {
        await api.patch("/auth/profile", data);
        await get().fetchMe();
      },

      changePassword: async (currentPassword, newPassword) => {
        await api.patch("/auth/password", { currentPassword, newPassword });
      },

      deleteAccount: async (password) => {
        await api.post("/auth/delete-account", { password });
        get().logout();
      },
    }),
    {
      name: "presto-auth",
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
