import { localeMap } from "@presto/shared";
import { usePreferencesStore } from "@/stores/preferences.store";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const defaultCurrencyMap: Record<string, string> = {
  fr: "EUR",
  en: "USD",
};

export function formatCurrency(amount: number, currency?: string): string {
  const prefs = usePreferencesStore.getState();
  const locale = localeMap[prefs.locale] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? defaultCurrencyMap[prefs.locale] ?? "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 1): string {
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}
