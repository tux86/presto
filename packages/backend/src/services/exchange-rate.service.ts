const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** In-memory cache — refreshed from API every 24h */
let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

/**
 * Fetches USD-based rates from frankfurter.app.
 */
async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch("https://api.frankfurter.app/latest?base=USD");
  if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  return { USD: 1, ...data.rates };
}

/**
 * Returns USD-based exchange rates from in-memory cache.
 * Fetches from API on first call or when cache is stale (>24h).
 * Throws if the API is unreachable and no cached rates exist.
 */
async function getRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < STALE_MS) {
    return cache.rates;
  }

  try {
    const rates = await fetchRates();
    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    if (cache) return cache.rates;
    throw new Error("Exchange rates unavailable: API unreachable and no cached rates");
  }
}

/**
 * Convert an amount from one currency to another using USD as the pivot.
 * Formula: amount * (usdToTarget / usdToSource)
 * Throws if exchange rates are unavailable — never returns unconverted amounts silently.
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to || amount === 0) return amount;

  const rates = await getRates();
  const usdToSource = from === "USD" ? 1 : rates[from];
  const usdToTarget = to === "USD" ? 1 : rates[to];

  if (!usdToSource) throw new Error(`Exchange rate unavailable for currency: ${from}`);
  if (!usdToTarget) throw new Error(`Exchange rate unavailable for currency: ${to}`);

  return amount * (usdToTarget / usdToSource);
}
