export const CLIENT_COLOR_KEYS = ["blue", "emerald", "amber", "purple", "rose", "cyan", "orange", "pink"] as const;

export type ClientColorKey = (typeof CLIENT_COLOR_KEYS)[number];
