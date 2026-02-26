import type { CSSProperties } from "react";

/** Default chart colors used across reporting components. */
export const CHART_COLORS = {
  indigo: "#6366f1",
  emerald: "#10b981",
} as const;

/** Shared tooltip style for Recharts Tooltip components. */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "var(--th-panel)",
  border: "1px solid var(--th-edge)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--th-body)",
};
