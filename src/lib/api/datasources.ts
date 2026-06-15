import type { SoDEXTicker, SoDEXKline } from "../types/trade";
import type { CoinPerf } from "../types/datasource";
import { parseApiResponse } from "./client";

export async function fetchStatus(): Promise<{
  services: { name: string; status: "connected" | "error" | "no_key"; detail: string; latencyMs: number }[];
}> {
  const res = await fetch("/api/status", { cache: "no-store" });
  return parseApiResponse(res);
}

let lastGoodTickers: SoDEXTicker[] | null = null;

export async function fetchTickers(): Promise<SoDEXTicker[] | null> {
  const res = await fetch("/api/market/tickers", { cache: "no-store" });
  if (!res.ok) return lastGoodTickers;
  const data = await parseApiResponse<SoDEXTicker[]>(res);
  if (data && Array.isArray(data) && data.length > 0) lastGoodTickers = data;
  return data;
}

const lastGoodKlines = new Map<string, SoDEXKline[]>();

export async function fetchKlines(
  symbol: string,
  interval = "1h",
  limit = 30,
): Promise<SoDEXKline[] | null> {
  const cacheKey = `${symbol}:${interval}:${limit}`;
  const res = await fetch(
    `/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) return lastGoodKlines.get(cacheKey) ?? null;
  const data = await parseApiResponse<SoDEXKline[]>(res);
  if (data && Array.isArray(data) && data.length > 0) lastGoodKlines.set(cacheKey, data);
  return data;
}

export async function fetchPerformance(): Promise<{ coins: CoinPerf[] }> {
  const res = await fetch("/api/performance", { cache: "no-store" });
  return parseApiResponse(res);
}
