import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from "react";
import { isLocale, type Locale } from "../core/types.ts";
import { type Translate, translator } from "../i18n/index.ts";

export type Theme = "light" | "dark" | "auto";

const KEY = "presto.prefs";

interface Stored {
  theme: Theme;
  locale: Locale;
}

function read(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Stored>;
    return {
      theme: raw.theme === "dark" || raw.theme === "auto" ? raw.theme : "light",
      locale: isLocale(raw.locale) ? raw.locale : defaultLocale(),
    };
  } catch {
    return { theme: "light", locale: defaultLocale() };
  }
}

function defaultLocale(): Locale {
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Applied before React mounts so the first paint is already the right theme.
const initial = read();
applyTheme(initial.theme);
document.documentElement.lang = initial.locale;

interface Prefs extends Stored {
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [locale, setLocaleState] = useState<Locale>(initial.locale);

  const persist = useCallback((next: Stored) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private browsing, quota, whatever — preferences are not worth failing over.
    }
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      applyTheme(next);
      persist({ theme: next, locale });
    },
    [locale, persist],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.documentElement.lang = next;
      persist({ theme, locale: next });
    },
    [theme, persist],
  );

  // Follow the system only while the user has asked us to.
  useEffect(() => {
    if (theme !== "auto") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<Prefs>(
    () => ({ theme, locale, setTheme, setLocale, t: translator(locale) }),
    [theme, locale, setTheme, setLocale],
  );

  return <PrefsContext value={value}>{children}</PrefsContext>;
}

export function usePrefs(): Prefs {
  const value = use(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside PrefsProvider");
  return value;
}

/** Shorthand for the common case of only needing the translator. */
export function useT(): { t: Translate; locale: Locale } {
  const { t, locale } = usePrefs();
  return { t, locale };
}
