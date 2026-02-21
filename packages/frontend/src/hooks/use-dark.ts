import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/theme.store";

export function useIsDark() {
  const mode = useThemeStore((s) => s.mode);
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
