import type { Locale } from "@presto/shared";
import { create } from "zustand";
import { api } from "../api/client";

interface AppConfig {
  appName: string;
  authEnabled: boolean;
  registrationEnabled: boolean;
  defaults: {
    theme: "light" | "dark";
    locale: Locale | null;
  };
}

interface ConfigState {
  config: AppConfig | null;
  loaded: boolean;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>()((set) => ({
  config: null,
  loaded: false,

  fetchConfig: async () => {
    try {
      const config = await api.get<AppConfig>("/config");
      set({ config, loaded: true });
    } catch {
      set({
        config: {
          appName: "Presto",
          authEnabled: true,
          registrationEnabled: true,
          defaults: { theme: "light", locale: null },
        },
        loaded: true,
      });
    }
  },
}));
