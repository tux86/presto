import { eq } from "drizzle-orm";
import { db, exchangeRates } from "../db/index.js";

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches EUR-based rates from frankfurter.app and upserts them into the DB.
 * Returns a map of currency → rate (EUR = 1).
 */
async function fetchAndStoreRates(): Promise<Record<string, number>> {
  const res = await fetch("https://api.frankfurter.app/latest?base=EUR");
  if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };

  const now = new Date();
  const entries = Object.entries(data.rates);

  // Upsert each rate — use delete + insert (works on all dialects)
  for (const [currency, rate] of entries) {
    await db.delete(exchangeRates).where(eq(exchangeRates.currency, currency));
    await db.insert(exchangeRates).values({ currency, rate, updatedAt: now });
  }

  return { EUR: 1, ...data.rates };
}

/**
 * Loads rates from DB. Returns null if no rates exist.
 */
async function loadRatesFromDb(): Promise<{ rates: Record<string, number>; stale: boolean } | null> {
  const rows = await db.query.exchangeRates.findMany();
  if (rows.length === 0) return null;

  const rates: Record<string, number> = { EUR: 1 };
  let oldestUpdate = Date.now();

  for (const row of rows) {
    rates[row.currency] = row.rate;
    const ts = row.updatedAt instanceof Date ? row.updatedAt.getTime() : Number(row.updatedAt);
    if (ts < oldestUpdate) oldestUpdate = ts;
  }

  return { rates, stale: Date.now() - oldestUpdate > STALE_MS };
}

/**
 * Returns EUR-based exchange rates. Fetches from API only if DB rates are missing or stale (>24h).
 */
async function getRates(): Promise<Record<string, number>> {
  const cached = await loadRatesFromDb();

  if (cached && !cached.stale) {
    return cached.rates;
  }

  try {
    return await fetchAndStoreRates();
  } catch {
    // API failed — use stale DB rates if available
    if (cached) return cached.rates;
    // No rates at all — return EUR-only (no conversion possible)
    return { EUR: 1 };
  }
}

/**
 * Convert an amount from one currency to another using EUR as the pivot.
 * Formula: amount * (eurToTarget / eurToSource)
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to || amount === 0) return amount;

  const rates = await getRates();
  const eurToSource = from === "EUR" ? 1 : rates[from];
  const eurToTarget = to === "EUR" ? 1 : rates[to];

  if (!eurToSource || !eurToTarget) return amount; // Unknown currency — return as-is

  return amount * (eurToTarget / eurToSource);
}
