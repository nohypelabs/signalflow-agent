"use client";

import { useEffect, useState } from "react";
import type { SignalsData } from "../types/signal";
import type { TradingType } from "../types/trading-type";
import { fetchSignals } from "../api/signals";
import {
  DEFAULT_STRATEGY_CONFIG,
  STRATEGY_CONFIG_EVENT,
  STRATEGY_CONFIG_STORAGE_KEY,
  loadStrategyConfig,
} from "../strategy/config";

export type { SignalsData };
export type { LiveSignalDimensions as SignalDimensions, DimensionData } from "../types/signal";

export function useSignals(tradingType?: TradingType | null) {
  const [data, setData] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!strategyReady) return;
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchSignals(tradingType, strategyConfig);
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Signal fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [strategyConfig, strategyReady, tradingType]);

  return { data, loading, error, strategyConfig };
}
