import type { Locale } from "../core/types.ts";
import { type Dictionary, en, type TranslationKey } from "./en.ts";
import { fr } from "./fr.ts";

export type { Dictionary, TranslationKey };

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** A translator bound to one locale. Missing keys fall back to English. */
export function translator(locale: Locale): Translate {
  const dict = DICTIONARIES[locale] ?? en;
  return (key, params) => {
    let value: string = dict[key] ?? en[key] ?? key;
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  };
}

/** "1 day" / "3 days", in the requested locale. */
export function dayUnit(t: Translate, count: number): string {
  return count === 1 ? t("pdf.dayUnit") : t("pdf.dayUnitPlural");
}
