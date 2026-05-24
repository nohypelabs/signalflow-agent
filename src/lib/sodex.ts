const MAINNET_SPOT = "https://mainnet-gw.sodex.dev/api/v1/spot";
const TESTNET_SPOT = "https://testnet-gw.sodex.dev/api/v1/spot";

function baseUrl(): string {
  const network = process.env.SODEX_NETWORK || "mainnet";
  return network === "mainnet" ? MAINNET_SPOT : TESTNET_SPOT;
}

async function sodexFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SoDEX ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

import type { SoDEXTicker, SoDEXKline, SoDEXSymbol, OrderBook } from "./sodex-types";
export type { SoDEXTicker, SoDEXKline, SoDEXSymbol, OrderBook };

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

export function getAccountState(userAddress: string) {
  return sodexFetch<Record<string, unknown>>(`/accounts/${userAddress}/state`);
}
