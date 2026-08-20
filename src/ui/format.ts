import type { ClientColor, Locale } from "../core/types.ts";

const INTL: Record<Locale, string> = { en: "en-US", fr: "fr-FR" };

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function money(amount: number, currency: string, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Halves keep their decimal; whole days do not gain a trailing zero. */
export function days(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Compact axis labels: 12500 → "12.5k". */
export function compact(value: number): string {
  if (Math.abs(value) < 1000) return String(Math.round(value));
  const thousands = value / 1000;
  return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
}

export const CURRENCIES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("currency");
  } catch {
    return ["EUR", "USD", "GBP", "CHF", "CAD"];
  }
})();

export function currencyLabel(code: string, locale: Locale = "en"): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
    return `${code} — ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  } catch {
    return code;
  }
}

/** Tailwind classes per client colour, so a client looks the same everywhere. */
export const COLORS: Record<ClientColor, { dot: string; solid: string; soft: string; text: string; ring: string }> = {
  rose: {
    dot: "bg-rose-500",
    solid: "bg-rose-500",
    soft: "bg-rose-500/12",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/40",
  },
  orange: {
    dot: "bg-orange-500",
    solid: "bg-orange-500",
    soft: "bg-orange-500/12",
    text: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/40",
  },
  amber: {
    dot: "bg-amber-500",
    solid: "bg-amber-500",
    soft: "bg-amber-500/12",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/40",
  },
  lime: {
    dot: "bg-lime-600",
    solid: "bg-lime-600",
    soft: "bg-lime-600/12",
    text: "text-lime-700 dark:text-lime-400",
    ring: "ring-lime-600/40",
  },
  emerald: {
    dot: "bg-emerald-500",
    solid: "bg-emerald-500",
    soft: "bg-emerald-500/12",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/40",
  },
  cyan: {
    dot: "bg-cyan-500",
    solid: "bg-cyan-500",
    soft: "bg-cyan-500/12",
    text: "text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500/40",
  },
  blue: {
    dot: "bg-blue-500",
    solid: "bg-blue-500",
    soft: "bg-blue-500/12",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/40",
  },
  indigo: {
    dot: "bg-indigo-500",
    solid: "bg-indigo-500",
    soft: "bg-indigo-500/12",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/40",
  },
  purple: {
    dot: "bg-purple-500",
    solid: "bg-purple-500",
    soft: "bg-purple-500/12",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/40",
  },
  pink: {
    dot: "bg-pink-500",
    solid: "bg-pink-500",
    soft: "bg-pink-500/12",
    text: "text-pink-600 dark:text-pink-400",
    ring: "ring-pink-500/40",
  },
  slate: {
    dot: "bg-slate-500",
    solid: "bg-slate-500",
    soft: "bg-slate-500/12",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/40",
  },
  zinc: {
    dot: "bg-zinc-600",
    solid: "bg-zinc-600",
    soft: "bg-zinc-600/12",
    text: "text-zinc-700 dark:text-zinc-400",
    ring: "ring-zinc-600/40",
  },
};

const HEX: Record<ClientColor, string> = {
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  lime: "#65a30d",
  emerald: "#10b981",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  slate: "#64748b",
  zinc: "#52525b",
};

const ORDER = Object.keys(COLORS) as ClientColor[];

/** Fall back to a stable colour derived from the name, so charts stay readable. */
export function colorOf(name: string, color: ClientColor | null): ClientColor {
  if (color) return color;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ORDER[hash % ORDER.length]!;
}

export function hexOf(name: string, color: ClientColor | null): string {
  return HEX[colorOf(name, color)];
}
