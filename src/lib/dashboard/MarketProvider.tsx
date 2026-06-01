"use client";

import { useMemo } from "react";
import type { SoDEXTicker } from "../types/trade";
import { useMarket } from "../hooks/useMarket";
import { pairToSodexSymbol } from "../pair-map";

const DEFAULT_PAIR = "vBTC_vUSDC";

export interface MarketProviderState {
  tickers: ReturnType<typeof useMarket>["tickers"];
  klines: ReturnType<typeof useMarket>["klines"];
  marketLoading: boolean;
  marketError: string | null;
  sodexStatus: "connected" | "error" | "loading";
  tickerMap: Map<string, SoDEXTicker>;
  selectedPairDisplay: string;
}

export function useMarketProviderState(selectedPair: string): MarketProviderState {
  const selectedPairDisplay = selectedPair;
  const sodexSymbol = pairToSodexSymbol(selectedPair) || DEFAULT_PAIR;
  const { tickers, klines, loading: marketLoading, error: marketError } = useMarket(sodexSymbol);

  const tickerMap = useMemo(() => {
    const map = new Map<string, SoDEXTicker>();
    if (tickers) tickers.forEach((ticker) => map.set(ticker.symbol, ticker));
    return map;
  }, [tickers]);

  const sodexStatus: "connected" | "error" | "loading" =
    marketLoading ? "loading" : marketError ? "error" : tickers ? "connected" : "loading";

  return {
    tickers,
    klines,
    marketLoading,
    marketError,
    sodexStatus,
    tickerMap,
    selectedPairDisplay,
  };
}
