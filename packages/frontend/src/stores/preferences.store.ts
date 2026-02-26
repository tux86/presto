import type { Locale, ThemeMode, UserSettings } from "@presto/shared";
import { create } from "zustand";
import { api } from "@/api/client";
import { queryClient } from "@/lib/query-client";

const STORAGE_KEY = "presto-preferences";

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

function persistToStorage(prefs: { theme: ThemeMode; locale: Locale; baseCurrency: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function readFromStorage(): { theme?: ThemeMode; locale?: Locale; baseCurrency?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// Hydrate initial state from localStorage (instant, no flash)
const stored = readFromStorage();
const initialTheme = stored.theme ?? "light";
const initialLocale = stored.locale ?? "en";
const initialCurrency = stored.baseCurrency ?? "EUR";

// Apply theme and locale immediately to avoid flash
applyTheme(initialTheme);
document.documentElement.lang = initialLocale;

export const usePreferencesStore = create<PreferencesState>()((set) => ({
  theme: initialTheme,
  locale: initialLocale,
  baseCurrency: initialCurrency,
  loaded: !!stored.theme, // If localStorage has data, mark as loaded immediately

  setTheme: (theme) => {
    const { locale, baseCurrency } = usePreferencesStore.getState();
    applyTheme(theme);
    set({ theme });
    persistToStorage({ theme, locale, baseCurrency });
    api.patch("/settings", { theme }).catch(() => {});
  },

  setLocale: (locale) => {
    const { theme, baseCurrency } = usePreferencesStore.getState();
    document.documentElement.lang = locale;
    set({ locale });
    persistToStorage({ theme, locale, baseCurrency });
    api.patch("/settings", { locale }).catch(() => {});
  },

  setBaseCurrency: (baseCurrency) => {
    const { theme, locale } = usePreferencesStore.getState();
    set({ baseCurrency });
    persistToStorage({ theme, locale, baseCurrency });
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
      persistToStorage({ theme, locale, baseCurrency: settings.baseCurrency });
      set({ theme, locale, baseCurrency: settings.baseCurrency, loaded: true });
    } catch {
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

export type { ThemeMode, Locale };
