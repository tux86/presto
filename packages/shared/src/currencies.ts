/** All currency codes supported by the runtime (ISO 4217). */
export const CURRENCIES = Intl.supportedValuesOf("currency") as [string, ...string[]];

export type CurrencyCode = string;

/** Get currency symbol (e.g. "€", "$", "£"). */
export function getCurrencySymbol(code: string, locale = "en"): string {
  try {
    return (
      new Intl.NumberFormat(locale, { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}

/** Get currency display name (e.g. "Euro", "US Dollar"). */
export function getCurrencyName(code: string, locale = "en"): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code;
  }
}

/** Get formatted label: "€ EUR — Euro". */
export function getCurrencyLabel(code: string, locale = "en"): string {
  const symbol = getCurrencySymbol(code, locale);
  const name = getCurrencyName(code, locale);
  return `${symbol} ${code} — ${name}`;
}
