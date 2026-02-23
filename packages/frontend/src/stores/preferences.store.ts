import type { Locale, ThemeMode, UserSettings } from "@presto/shared";
import { create } from "zustand";
import { api } from "../api/client";
import { queryClient } from "../lib/query-client";

interface PreferencesState {
  theme: ThemeMode;
  locale: Locale;
  baseCurrency: string;
  loaded: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setBaseCurrency: (currency: string) => void;
  fetchSettings: () => Promise<void>;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", mode === "dark");
  }
}

export const usePreferencesStore = create<PreferencesState>()((set) => ({
  theme: "dark",
  locale: "en",
  baseCurrency: "EUR",
  loaded: false,

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
    api.patch("/settings", { theme }).catch(() => {});
  },

  setLocale: (locale) => {
    document.documentElement.lang = locale;
    set({ locale });
    api.patch("/settings", { locale }).catch(() => {});
  },

  setBaseCurrency: (baseCurrency) => {
    set({ baseCurrency });
    api.patch("/settings", { baseCurrency }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["reporting"] });
  },

  fetchSettings: async () => {
    try {
      const settings = await api.get<UserSettings>("/settings");
      const theme = settings.theme as ThemeMode;
      const locale = settings.locale as Locale;
      applyTheme(theme);
      document.documentElement.lang = locale;
      set({ theme, locale, baseCurrency: settings.baseCurrency, loaded: true });
    } catch {
      // Fallback: keep defaults, mark as loaded
      set({ loaded: true });
    }
  },
}));

// Listen for system theme changes when mode is "auto"
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { theme } = usePreferencesStore.getState();
    if (theme === "auto") applyTheme("auto");
  });
}

export { applyTheme };
export type { ThemeMode, Locale };
