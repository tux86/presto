const REFRESH_MS = 60 * 60 * 1000; // 1 hour

let cache: Record<string, number> | null = null;
let timer: Timer | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch("https://api.frankfurter.app/latest?base=USD");
  if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  return { USD: 1, ...data.rates };
}

async function refreshLoop() {
  try {
    cache = await fetchRates();
  } catch (e) {
    console.error("Exchange rate refresh failed:", e instanceof Error ? e.message : e);
  }
  timer = setTimeout(refreshLoop, REFRESH_MS);
}

/** Fetch rates eagerly at startup. Call once before accepting requests. */
export async function initExchangeRates(): Promise<void> {
  try {
    cache = await fetchRates();
  } catch (e) {
    console.warn("Exchange rates unavailable at startup:", e instanceof Error ? e.message : e);
  }
  timer = setTimeout(refreshLoop, REFRESH_MS);
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

  if (!cache) throw new Error("Exchange rates unavailable: not yet initialized");

  const usdToSource = from === "USD" ? 1 : cache[from];
  const usdToTarget = to === "USD" ? 1 : cache[to];

  if (!usdToSource) throw new Error(`Exchange rate unavailable for currency: ${from}`);
  if (!usdToTarget) throw new Error(`Exchange rate unavailable for currency: ${to}`);

  return amount * (usdToTarget / usdToSource);
}
