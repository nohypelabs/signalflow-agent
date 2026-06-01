import type { SoDEXTicker, SoDEXKline } from "../types/trade";
import type { CoinPerf } from "../types/datasource";
import { parseApiResponse } from "./client";

export async function fetchStatus(): Promise<{
  services: { name: string; status: "connected" | "error" | "no_key"; detail: string; latencyMs: number }[];
}> {
  const res = await fetch("/api/status", { cache: "no-store" });
  return parseApiResponse(res);
}

export async function fetchTickers(): Promise<SoDEXTicker[] | null> {
  const res = await fetch("/api/market/tickers", { cache: "no-store" });
  if (!res.ok) return null;
  return parseApiResponse(res);
}

export async function fetchKlines(
  symbol: string,
  interval = "1h",
  limit = 30,
): Promise<SoDEXKline[] | null> {
  const res = await fetch(
    `/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return parseApiResponse(res);
}

export async function fetchPerformance(): Promise<{ coins: CoinPerf[] }> {
  const res = await fetch("/api/performance", { cache: "no-store" });
  return parseApiResponse(res);
}
