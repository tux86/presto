import type { ClientColorKey } from "@presto/shared";
import { localeMap } from "@presto/shared";
import { usePreferencesStore } from "@/stores/preferences.store";

/** Download a blob response as a file. Extracts filename from Content-Disposition header if present. */
export async function downloadBlob(response: Response, fallbackFilename: string): Promise<void> {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="(.+?)"/);
  const filename = filenameMatch?.[1] ?? fallbackFilename;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Compact axis tick formatter for charts (e.g. 1500 → "1.5k"). */
export function compactTick(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
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
  slate: {
    bg: "bg-slate-500/15",
    border: "border-slate-500/25",
    text: "text-slate-700 dark:text-slate-400",
    dot: "bg-slate-500",
  },
  zinc: {
    bg: "bg-zinc-700/15",
    border: "border-zinc-700/25",
    text: "text-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-700 dark:bg-zinc-500",
  },
  rose: {
    bg: "bg-rose-500/15",
    border: "border-rose-500/25",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  orange: {
    bg: "bg-orange-500/15",
    border: "border-orange-500/25",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  amber: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  lime: {
    bg: "bg-lime-500/15",
    border: "border-lime-500/25",
    text: "text-lime-700 dark:text-lime-400",
    dot: "bg-lime-500",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cyan: {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/25",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  blue: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/25",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  indigo: {
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/25",
    text: "text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  purple: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/25",
    text: "text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  pink: {
    bg: "bg-pink-500/15",
    border: "border-pink-500/25",
    text: "text-pink-700 dark:text-pink-400",
    dot: "bg-pink-500",
  },
};

const COLOR_VALUES = Object.values(CLIENT_COLOR_MAP);

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Returns a color set for a client. Uses the explicit color key if provided, otherwise falls back to a name hash. */
export function getClientColor(
  name: string,
  color?: string | null,
): { bg: string; border: string; text: string; dot: string } {
  if (color && color in CLIENT_COLOR_MAP) {
    return CLIENT_COLOR_MAP[color as ClientColorKey];
  }
  return COLOR_VALUES[hashName(name) % COLOR_VALUES.length];
}

/** Calendar-specific color classes for activity report day cells. */
export interface CalendarColors {
  /** Full-day bg + half-day triangle */
  solid: string;
  /** Full-day bg on holiday/weekend */
  solidMuted: string;
  /** Border for active cells */
  border: string;
  /** Border for active holiday/weekend cells */
  borderMuted: string;
  /** Hover bg for full-day */
  hoverBg: string;
  /** Hover border for half-day */
  hoverBorder: string;
  /** Day name text on full normal day */
  textLight: string;
  /** Half-day fraction badge */
  textBadge: string;
}

const CLIENT_CALENDAR_MAP: Record<ClientColorKey, CalendarColors> = {
  slate: {
    solid: "bg-slate-600",
    solidMuted: "bg-slate-600/70",
    border: "border-slate-500",
    borderMuted: "border-slate-500/60",
    hoverBg: "hover:bg-slate-500",
    hoverBorder: "hover:border-slate-400",
    textLight: "text-slate-200",
    textBadge: "text-slate-300",
  },
  zinc: {
    solid: "bg-zinc-800",
    solidMuted: "bg-zinc-800/70",
    border: "border-zinc-600",
    borderMuted: "border-zinc-600/60",
    hoverBg: "hover:bg-zinc-700",
    hoverBorder: "hover:border-zinc-500",
    textLight: "text-zinc-300",
    textBadge: "text-zinc-400",
  },
  rose: {
    solid: "bg-rose-600",
    solidMuted: "bg-rose-600/70",
    border: "border-rose-500",
    borderMuted: "border-rose-500/60",
    hoverBg: "hover:bg-rose-500",
    hoverBorder: "hover:border-rose-400",
    textLight: "text-rose-200",
    textBadge: "text-rose-300",
  },
  orange: {
    solid: "bg-orange-600",
    solidMuted: "bg-orange-600/70",
    border: "border-orange-500",
    borderMuted: "border-orange-500/60",
    hoverBg: "hover:bg-orange-500",
    hoverBorder: "hover:border-orange-400",
    textLight: "text-orange-200",
    textBadge: "text-orange-300",
  },
  amber: {
    solid: "bg-amber-600",
    solidMuted: "bg-amber-600/70",
    border: "border-amber-500",
    borderMuted: "border-amber-500/60",
    hoverBg: "hover:bg-amber-500",
    hoverBorder: "hover:border-amber-400",
    textLight: "text-amber-200",
    textBadge: "text-amber-300",
  },
  lime: {
    solid: "bg-lime-600",
    solidMuted: "bg-lime-600/70",
    border: "border-lime-500",
    borderMuted: "border-lime-500/60",
    hoverBg: "hover:bg-lime-500",
    hoverBorder: "hover:border-lime-400",
    textLight: "text-lime-200",
    textBadge: "text-lime-300",
  },
  emerald: {
    solid: "bg-emerald-600",
    solidMuted: "bg-emerald-600/70",
    border: "border-emerald-500",
    borderMuted: "border-emerald-500/60",
    hoverBg: "hover:bg-emerald-500",
    hoverBorder: "hover:border-emerald-400",
    textLight: "text-emerald-200",
    textBadge: "text-emerald-300",
  },
  cyan: {
    solid: "bg-cyan-600",
    solidMuted: "bg-cyan-600/70",
    border: "border-cyan-500",
    borderMuted: "border-cyan-500/60",
    hoverBg: "hover:bg-cyan-500",
    hoverBorder: "hover:border-cyan-400",
    textLight: "text-cyan-200",
    textBadge: "text-cyan-300",
  },
  blue: {
    solid: "bg-blue-600",
    solidMuted: "bg-blue-600/70",
    border: "border-blue-500",
    borderMuted: "border-blue-500/60",
    hoverBg: "hover:bg-blue-500",
    hoverBorder: "hover:border-blue-400",
    textLight: "text-blue-200",
    textBadge: "text-blue-300",
  },
  indigo: {
    solid: "bg-indigo-600",
    solidMuted: "bg-indigo-600/70",
    border: "border-indigo-500",
    borderMuted: "border-indigo-500/60",
    hoverBg: "hover:bg-indigo-500",
    hoverBorder: "hover:border-indigo-400",
    textLight: "text-indigo-200",
    textBadge: "text-indigo-300",
  },
  purple: {
    solid: "bg-purple-600",
    solidMuted: "bg-purple-600/70",
    border: "border-purple-500",
    borderMuted: "border-purple-500/60",
    hoverBg: "hover:bg-purple-500",
    hoverBorder: "hover:border-purple-400",
    textLight: "text-purple-200",
    textBadge: "text-purple-300",
  },
  pink: {
    solid: "bg-pink-600",
    solidMuted: "bg-pink-600/70",
    border: "border-pink-500",
    borderMuted: "border-pink-500/60",
    hoverBg: "hover:bg-pink-500",
    hoverBorder: "hover:border-pink-400",
    textLight: "text-pink-200",
    textBadge: "text-pink-300",
  },
};

const CALENDAR_VALUES = Object.values(CLIENT_CALENDAR_MAP);

const DEFAULT_CALENDAR_COLORS = CLIENT_CALENDAR_MAP.indigo;

/** Returns calendar color classes for a client. Uses explicit color key, name hash, or indigo fallback. */
export function getClientCalendarColors(name?: string, color?: string | null): CalendarColors {
  if (color && color in CLIENT_CALENDAR_MAP) {
    return CLIENT_CALENDAR_MAP[color as ClientColorKey];
  }
  if (!name) return DEFAULT_CALENDAR_COLORS;
  return CALENDAR_VALUES[hashName(name) % CALENDAR_VALUES.length];
}

/** Hex color map for Recharts charts (matches Tailwind 500 shades). */
export const CLIENT_HEX_MAP: Record<ClientColorKey, string> = {
  slate: "#64748b",
  zinc: "#3f3f46",
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  lime: "#84cc16",
  emerald: "#10b981",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
};

const HEX_VALUES = Object.values(CLIENT_HEX_MAP);

/** Returns a hex color string for a client (for Recharts). */
export function getClientHexColor(name: string, color?: string | null): string {
  if (color && color in CLIENT_HEX_MAP) {
    return CLIENT_HEX_MAP[color as ClientColorKey];
  }
  return HEX_VALUES[hashName(name) % HEX_VALUES.length];
}
