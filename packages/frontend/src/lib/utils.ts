import type { ClientColorKey } from "@presto/shared";
import { localeMap } from "@presto/shared";
import { usePreferencesStore } from "@/stores/preferences.store";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number, currency?: string): string {
  const prefs = usePreferencesStore.getState();
  const locale = localeMap[prefs.locale] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? prefs.baseCurrency ?? "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 1): string {
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}

export const CLIENT_COLOR_MAP: Record<ClientColorKey, { bg: string; border: string; text: string; dot: string }> = {
  blue: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/25",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  purple: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/25",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  rose: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/25",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/25",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  orange: {
    bg: "bg-orange-500/15",
    border: "border-orange-500/25",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  pink: {
    bg: "bg-pink-500/15",
    border: "border-pink-500/25",
    text: "text-pink-700 dark:text-pink-400",
    dot: "bg-pink-500",
  },
};

const COLOR_VALUES = Object.values(CLIENT_COLOR_MAP);

/** Returns a color set for a client. Uses the explicit color key if provided, otherwise falls back to a name hash. */
export function getClientColor(
  name: string,
  color?: string | null,
): { bg: string; border: string; text: string; dot: string } {
  if (color && color in CLIENT_COLOR_MAP) {
    return CLIENT_COLOR_MAP[color as ClientColorKey];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLOR_VALUES[Math.abs(hash) % COLOR_VALUES.length];
}
