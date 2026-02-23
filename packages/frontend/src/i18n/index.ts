import { useCallback } from "react";
import { usePreferencesStore } from "@/stores/preferences.store";
import { de } from "./de";
import { en, type TranslationKey } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { pt } from "./pt";

const translations: Record<string, Record<TranslationKey, string>> = { en, fr, de, es, pt };

export function useT() {
  const locale = usePreferencesStore((s) => s.locale);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[locale] ?? en;
      let value = dict[key] ?? en[key] ?? key;
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
