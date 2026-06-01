import type { SoDEXTrade } from "../types/trade";
import { parseApiResponse } from "./client";

export interface RecentTradesData {
  trades: SoDEXTrade[];
  updated: number;
}

export async function fetchRecentTrades(symbol: string, limit = 50): Promise<RecentTradesData> {
  const res = await fetch(
    `/api/trades/recent?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
    { cache: "no-store" },
  );
  return parseApiResponse(res);
}
