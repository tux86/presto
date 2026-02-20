import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
    }),
    {
      name: "presto-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode);
      },
    }
  )
);

// Listen for system theme changes when mode is "auto"
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { mode } = useThemeStore.getState();
      if (mode === "auto") applyTheme("auto");
    });
}
