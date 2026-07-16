const MAINNET_SPOT = "https://mainnet-gw.sodex.dev/api/v1/spot";
const TESTNET_SPOT = "https://testnet-gw.sodex.dev/api/v1/spot";

function baseUrl(): string {
  const network = process.env.SODEX_NETWORK || "mainnet";
  return network === "mainnet" ? MAINNET_SPOT : TESTNET_SPOT;
}

// ── In-process cache ──────────────────────────────────────
// /api/signals calls getSodexKlines/getOrderbook directly (not via the
// cached /api/market/* routes), so without this every signal request fires
// dozens of fresh HTTP calls to SoDEX → rate-limit storms + 20s+ first loads.
interface CacheEntry<T> {
  data: T;
  ts: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_MS = 10_000; // 10s — matches market route kline TTL

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.data as T;
  return null;
}
function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

// ── Concurrency limiter ───────────────────────────────────
// Cap parallel SoDEX calls so we don't burst 50+ concurrent requests
// (which trips per-IP rate limits and forces 5-8s timeouts).
const MAX_CONCURRENT = 6;
let active = 0;
const queue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => queue.push(resolve));
}
function release(): void {
  active--;
  const next = queue.shift();
  if (next) {
    active++;
    next();
  }
}

async function sodexFetch<T>(
  path: string,
  params?: Record<string, string>,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }

  const cacheKey = url.toString();
  const cached = cacheGet<T>(cacheKey);
  if (cached !== null) return cached;

  await acquire();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", ...init?.headers },
      signal: controller.signal,
      ...init,
    });

    if (!res.ok) {
      throw new Error(`SoDEX ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    const data = json.data as T;
    cacheSet(cacheKey, data);
    return data;
  } finally {
    clearTimeout(timeout);
    release();
  }
}

function authHeaders(): Record<string, string> {
  const keyName = process.env.SODEX_API_KEY_NAME;
  return keyName ? { "x-api-key": keyName } : {};
}

import type {
  SoDEXTicker,
  SoDEXKline,
  SoDEXSymbol,
  OrderBook,
  SoDEXNewOrderRequest,
  SoDEXOrder,
  SoDEXBalance,
  SoDEXAccountState,
  SoDEXTrade,
} from "./sodex-types";
export type {
  SoDEXTicker,
  SoDEXKline,
  SoDEXSymbol,
  OrderBook,
  SoDEXNewOrderRequest,
  SoDEXOrder,
  SoDEXBalance,
  SoDEXTrade,
};

// ── Public endpoints ───────────────────────────────────

export function getTickers(symbol?: string) {
  return sodexFetch<SoDEXTicker[]>("/markets/tickers", symbol ? { symbol } : undefined);
}

export function getKlines(
  symbol: string,
  interval: string,
  limit?: number,
  startTime?: number,
  endTime?: number,
) {
  return sodexFetch<SoDEXKline[]>(`/markets/${symbol}/klines`, {
    interval,
    ...(limit && { limit: String(limit) }),
    ...(startTime && { startTime: String(startTime) }),
    ...(endTime && { endTime: String(endTime) }),
  });
}

export function getSymbols(symbol?: string) {
  return sodexFetch<SoDEXSymbol[]>("/markets/symbols", symbol ? { symbol } : undefined);
}

export function getOrderbook(symbol: string, limit?: number) {
  return sodexFetch<OrderBook>(`/markets/${symbol}/orderbook`, {
    ...(limit && { limit: String(limit) }),
  });
}

export function getRecentTrades(symbol: string, limit?: number) {
  return sodexFetch<SoDEXTrade[]>(`/markets/${symbol}/trades`, {
    ...(limit && { limit: String(limit) }),
  });
}

// ── Authenticated trading endpoints ─────────────────────

export function placeOrder(order: SoDEXNewOrderRequest) {
  return sodexFetch<SoDEXOrder>("/orders", undefined, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(order),
  });
}

export function getOpenOrders() {
  return sodexFetch<SoDEXOrder[]>("/orders", undefined, {
    headers: authHeaders(),
  });
}

export async function cancelOrder(orderId: number): Promise<void> {
  const url = new URL(`${baseUrl()}/orders/${orderId}`);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Accept: "application/json", ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`SoDEX ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

export async function getAccountBalances(userAddress: string): Promise<SoDEXBalance[]> {
  const state = await sodexFetch<SoDEXAccountState>(
    `/accounts/${userAddress}/state`,
    undefined,
    { headers: authHeaders() },
  );
  return state.balances;
}
