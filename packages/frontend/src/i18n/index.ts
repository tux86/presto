import { useCallback } from "react";
import { useConfigStore } from "@/stores/config.store";
import { fr, type TranslationKey } from "./fr";
import { en } from "./en";

const translations: Record<string, Record<TranslationKey, string>> = { fr, en };

export function useT() {
  const locale = useConfigStore((s) => s.config?.locale ?? "fr");

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translations[locale] ?? fr;
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
