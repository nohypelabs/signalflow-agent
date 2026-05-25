"use client";

import { useEffect, useState } from "react";
import type { SoDEXTicker, SoDEXKline } from "../types/trade";
import { fetchTickers, fetchKlines } from "../api/datasources";

interface MarketState {
  tickers: SoDEXTicker[] | null;
  klines: SoDEXKline[] | null;
  loading: boolean;
  error: string | null;
}

export function useMarket(symbol: string, interval = "1h", klineLimit = 30) {
  const [state, setState] = useState<MarketState>({
    tickers: null,
    klines: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [tickers, klines] = await Promise.all([
          fetchTickers(),
          fetchKlines(symbol, interval, klineLimit),
        ]);
        if (!cancelled) setState({ tickers, klines, loading: false, error: null });
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to fetch market data",
          }));
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [symbol, interval, klineLimit]);

  return state;
}
