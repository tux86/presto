import { useEffect, useState } from "react";
import { usePreferencesStore } from "@/stores/preferences.store";

export function useIsDark() {
  const mode = usePreferencesStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (mode !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  if (mode === "auto") return systemDark;
  return mode === "dark";
}
