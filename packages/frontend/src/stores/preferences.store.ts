import { type Locale, SUPPORTED_LOCALES } from "@presto/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "auto";

/** Detect browser language and match to a supported locale */
function detectBrowserLocale(): Locale | undefined {
  const lang = navigator.language?.slice(0, 2);
  return SUPPORTED_LOCALES.find((l) => l === lang);
}

interface PreferencesState {
  theme: ThemeMode;
  locale: Locale;
  /** Tracks whether server defaults have been applied on first visit */
  _initialized: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  initFromServerDefaults: (defaults: { locale: Locale | null; theme: ThemeMode }) => void;
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

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      locale: "en",
      _initialized: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setLocale: (locale) => {
        document.documentElement.lang = locale;
        set({ locale });
      },
      initFromServerDefaults: (defaults) => {
        if (get()._initialized) return;
        const locale = defaults.locale ?? detectBrowserLocale() ?? "en";
        const theme = defaults.theme;
        set({ locale, theme, _initialized: true });
        document.documentElement.lang = locale;
        applyTheme(theme);
      },
    }),
    {
      name: "presto-preferences",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          document.documentElement.lang = state.locale;
        }
      },
    },
  ),
);

// Listen for system theme changes when mode is "auto"
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { theme } = usePreferencesStore.getState();
    if (theme === "auto") applyTheme("auto");
  });
}

export { applyTheme };
export type { ThemeMode, Locale };
