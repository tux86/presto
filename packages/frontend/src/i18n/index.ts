import { useCallback } from "react";
import { usePreferencesStore } from "@/stores/preferences.store";
import { en } from "./en";
import { fr, type TranslationKey } from "./fr";

const translations: Record<string, Record<TranslationKey, string>> = { fr, en };

export function useT() {
  const locale = usePreferencesStore((s) => s.locale);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[locale] ?? en;
      let value = dict[key] ?? fr[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [locale],
  );

  return { t, locale };
}

export type { TranslationKey };
