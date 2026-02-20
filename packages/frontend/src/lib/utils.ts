import { useConfigStore } from "@/stores/config.store";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const localeMap: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export function formatCurrency(amount: number): string {
  const config = useConfigStore.getState().config;
  const locale = localeMap[config?.locale ?? "fr"] ?? "fr-FR";
  const currency = config?.currency ?? "EUR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 1): string {
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}
