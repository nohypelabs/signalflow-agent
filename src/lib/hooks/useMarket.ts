"use client";

import { useQuery } from "@tanstack/react-query";
import type { SoDEXTicker, SoDEXKline } from "../types/trade";
import { fetchKlines } from "../api/datasources";
import { useTickers } from "./useTickers";

interface MarketState {
  tickers: SoDEXTicker[] | null;
  klines: SoDEXKline[] | null;
  loading: boolean;
  error: string | null;
}

export function useMarket(symbol: string, interval = "1h", klineLimit = 30): MarketState {
  const tickersQ = useTickers();

  const klinesQ = useQuery<SoDEXKline[] | null, Error>({
    queryKey: ["market-klines", symbol, interval, klineLimit],
    queryFn: () => fetchKlines(symbol, interval, klineLimit),
    enabled: !!symbol,
    staleTime: 15_000,
    refetchInterval: 30_000, // moderate refresh for selected pair candles (last bar may update)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const tickers = tickersQ.tickers;
  const klines = klinesQ.data ?? null;

  const loading = tickersQ.loading || klinesQ.isLoading || (klinesQ.isFetching && klines === null);
  const error =
    tickersQ.error ||
    (klinesQ.error ? (klinesQ.error instanceof Error ? klinesQ.error.message : "Failed to fetch klines") : null);

  return {
    tickers,
    klines,
    loading,
    error,
  };
}
