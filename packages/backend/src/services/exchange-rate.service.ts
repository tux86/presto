import { logger } from "../lib/logger.js";

const REFRESH_MS = 60 * 60 * 1000; // 1 hour
const RETRY_MS = 30 * 1000; // 30 seconds on failure
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

let cache: Record<string, number> | null = null;
let timer: Timer | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ExchangeRate API returned ${res.status}`);
  const data = (await res.json()) as { result: string; rates: Record<string, number> };
  if (data.result !== "success") throw new Error("ExchangeRate API returned non-success result");
  return data.rates;
}

async function refreshLoop() {
  let ok = false;
  try {
    cache = await fetchRates();
    ok = true;
  } catch (e) {
    logger.error("Exchange rate refresh failed:", e instanceof Error ? e.message : e);
  }
  timer = setTimeout(refreshLoop, ok ? REFRESH_MS : RETRY_MS);
}

/** Fetch rates eagerly at startup. Call once before accepting requests. */
export async function initExchangeRates(): Promise<void> {
  let ok = false;
  try {
    cache = await fetchRates();
    ok = true;
    logger.success(`Exchange rates loaded (${Object.keys(cache).length} currencies)`);
  } catch (e) {
    logger.warn("Exchange rates unavailable at startup:", e instanceof Error ? e.message : e);
  }
  timer = setTimeout(refreshLoop, ok ? REFRESH_MS : RETRY_MS);
}

/** Clear the background refresh timer for clean shutdown. */
export function stopExchangeRates(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

/**
 * Convert an amount from one currency to another using USD as the pivot.
 * Throws if exchange rates are unavailable — never returns unconverted amounts silently.
 */
export function convertAmount(amount: number, from: string, to: string): number {
  if (from === to || amount === 0) return amount;

  if (!cache) throw new ExchangeRateError("Exchange rates unavailable: not yet initialized");

  const usdToSource = from === "USD" ? 1 : cache[from];
  const usdToTarget = to === "USD" ? 1 : cache[to];

  if (!usdToSource) throw new ExchangeRateError(`Exchange rate unavailable for currency: ${from}`);
  if (!usdToTarget) throw new ExchangeRateError(`Exchange rate unavailable for currency: ${to}`);

  return amount * (usdToTarget / usdToSource);
}
