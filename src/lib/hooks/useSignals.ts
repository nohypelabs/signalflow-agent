"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SignalsData } from "../types/signal";
import type { TradingType } from "../types/trading-type";
import { fetchSignals } from "../api/signals";
import {
  DEFAULT_STRATEGY_CONFIG,
  STRATEGY_CONFIG_EVENT,
  STRATEGY_CONFIG_STORAGE_KEY,
  loadStrategyConfig,
  strategyConfigKey,
} from "../strategy/config";

export type { SignalsData };
export type { LiveSignalDimensions as SignalDimensions, DimensionData } from "../types/signal";

export function useSignals(tradingType?: TradingType | null) {
  const [strategyConfig, setStrategyConfig] = useState(DEFAULT_STRATEGY_CONFIG);
  const [strategyReady, setStrategyReady] = useState(false);

  useEffect(() => {
    const syncStrategy = () => {
      setStrategyConfig(loadStrategyConfig());
      setStrategyReady(true);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === STRATEGY_CONFIG_STORAGE_KEY) syncStrategy();
    };

    syncStrategy();
    window.addEventListener(STRATEGY_CONFIG_EVENT, syncStrategy);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(STRATEGY_CONFIG_EVENT, syncStrategy);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  // Derived stable key for RQ (includes strategy so config changes trigger correct fetch + cache isolation)
  const strategyKey = useMemo(() => strategyConfigKey(strategyConfig), [strategyConfig]);

  const signalsQuery = useQuery<SignalsData | null, Error>({
    queryKey: ["signals", tradingType ?? "all", strategyKey],
    queryFn: async ({ signal }) => {
      // Pass RQ abort signal for proper cancellation on unmount / route change
      return fetchSignals(tradingType, strategyConfig, signal);
    },
    enabled: strategyReady,
    staleTime: 8_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const data = signalsQuery.data ?? null;
  const loading = !strategyReady || signalsQuery.isPending || (signalsQuery.isFetching && data === null);
  const error = signalsQuery.error
    ? signalsQuery.error instanceof Error
      ? signalsQuery.error.message
      : "Signal fetch failed"
    : null;

  return { data, loading, error, strategyConfig };
}
