import type { SoDEXTrade } from "../types/trade";

export interface RecentTradesData {
  trades: SoDEXTrade[];
  updated: number;
}

export async function fetchRecentTrades(symbol: string, limit = 50): Promise<RecentTradesData> {
  const res = await fetch(
    `/api/trades/recent?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}
