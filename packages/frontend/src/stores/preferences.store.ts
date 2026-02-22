import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "auto";
type Locale = "fr" | "en";

interface PreferencesState {
  theme: ThemeMode;
  locale: Locale;
  /** Tracks whether server defaults have been applied on first visit */
  _initialized: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  initFromServerDefaults: (defaults: { locale: Locale }) => void;
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
        set({
          locale: defaults.locale,
          _initialized: true,
        });
        document.documentElement.lang = defaults.locale;
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
