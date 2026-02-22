/** Supported currency codes (ISO 4217). */
export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "RON",
  "HUF",
  "BRL",
  "MXN",
  "SGD",
  "HKD",
  "NZD",
  "ZAR",
  "INR",
  "AED",
  "SAR",
  "MAD",
  "TND",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

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
    return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
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
