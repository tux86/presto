import type { Locale, ThemeMode } from "@presto/shared";
import { create } from "zustand";
import { api } from "../api/client";

interface AppConfig {
  appName: string;
  authDisabled: boolean;
  registrationEnabled: boolean;
  demoMode: boolean;
  defaults: {
    theme: ThemeMode;
    locale: Locale;
    baseCurrency: string;
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
          authDisabled: false,
          registrationEnabled: true,
          demoMode: false,
          defaults: { theme: "light", locale: "en", baseCurrency: "EUR" },
        },
        loaded: true,
      });
    }
  },
}));
