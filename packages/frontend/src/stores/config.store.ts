import { create } from "zustand";
import { api } from "../api/client";

interface AppConfig {
  appName: string;
  theme: string;
  authEnabled: boolean;
  locale: "fr" | "en";
  holidayCountry: string;
  currency: string;
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
          theme: "light",
          authEnabled: true,
          locale: "fr",
          holidayCountry: "FR",
          currency: "EUR",
        },
        loaded: true,
      });
    }
  },
}));
