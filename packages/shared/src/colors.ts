export const CLIENT_COLOR_KEYS = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
  "slate",
  "zinc",
] as const;

export type ClientColorKey = (typeof CLIENT_COLOR_KEYS)[number];
