const MAINNET_SPOT = "https://mainnet-gw.sodex.dev/api/v1/spot";
const TESTNET_SPOT = "https://testnet-gw.sodex.dev/api/v1/spot";

function baseUrl(): string {
  const network = process.env.SODEX_NETWORK || "mainnet";
  return network === "mainnet" ? MAINNET_SPOT : TESTNET_SPOT;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", ...init?.headers },
    signal: controller.signal,
    ...init,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    throw new Error(`SoDEX ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
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
