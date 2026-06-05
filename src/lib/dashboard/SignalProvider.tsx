"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Signal } from "../types/signal";
import type { AIConfig } from "../types/datasource";
import { getProvider } from "../ai-providers";
import { useSignals } from "../hooks/useSignals";
import { useTradingType } from "../hooks/useTradingType";
import { useSignalGeneration } from "../hooks/useSignalGeneration";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { loadStrategyConfig, serializeStrategyConfig } from "../strategy/config";

function pairToCoin(pair: string): string {
  return pair.split("/")[0];
}

export function useSignalProviderState(
  aiConfig: AIConfig,
  tickers: { symbol: string; lastPx: string }[] | null,
) {
  const { tradingType } = useTradingType();
  const { data: signalsData, loading: signalsLoading, error: signalsError } = useSignals(tradingType);

  const {
    phase: signalPhase,
    baseSignal,
    aiThesis,
    aiError,
    analyzing,
    generate: generateRaw,
    clear: clearAISignal,
  } = useSignalGeneration(aiConfig);

  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [aiCoin, setAiCoin] = useState("BTC");
  const [includeAI, setIncludeAI] = useState(true);

  const aiSignal = baseSignal;
  const displaySignal = aiSignal ?? selectedSignal;
  const liveSignals: Signal[] = useMemo(() => signalsData?.signals ?? [], [signalsData?.signals]);
  const liveDims = useMemo(() =>
    signalsData && displaySignal
      ? signalsData.dimensions[pairToCoin(displaySignal.pair)] ?? null
      : null,
  [signalsData, displaySignal]);

  const aiProviderLabel = getProvider(aiConfig.providerId)?.name || "Deepseek";

  const {
    history,
    hydrated: historyHydrated,
    recordSignal,
    resolveSignals,
    stats: signalStats,
    byCoin: historyByCoin,
    calibration,
    equityCurve,
    drawdown,
    streaks,
    perCoin,
    frequency,
    resolutionWindow,
    setResolutionWindow,
    exportCSV,
  } = useSignalHistory();

  const generate = useCallback(async (coin: string, includeAIOverride?: boolean, strategySerialized?: string) => {
    // Always pass the current strategy so generate respects e.g. liquidityFlow (orderbook/EMA screening etc.)
    const strategyToUse = strategySerialized ?? serializeStrategyConfig(loadStrategyConfig());
    const sig = await generateRaw(coin, includeAIOverride ?? includeAI, strategyToUse);
    if (sig) {
      // Record every generated signal so that the Signal Reliability / accuracy tracking
      // in the statcard actually sees live "Generate Signal" actions and can resolve them later.
      recordSignal(sig);
    }
    return sig;
  }, [generateRaw, includeAI, recordSignal]);

  const resolvePending = useCallback(() => {
    if (!tickers || !historyHydrated) return;
    for (const ticker of tickers) {
      const pair = ticker.symbol;
      const coin = pair.startsWith("v") ? pair.split("_")[0].replace("v", "") : pair.split("_")[0];
      const price = parseFloat(ticker.lastPx);
      if (coin && !Number.isNaN(price)) {
        resolveSignals(coin, price);
      }
    }
  }, [tickers, historyHydrated, resolveSignals]);

  useEffect(() => {
    resolvePending();
  }, [resolvePending]);

  return {
    signalsData,
    liveSignals,
    signalsLoading,
    signalsError,
    aiProviderLabel,
    aiSignal,
    baseSignal,
    aiThesis,
    aiError,
    signalPhase,
    analyzing,
    includeAI,
    setIncludeAI,
    generate,
    clearAISignal,
    aiCoin,
    setAiCoin,
    history,
    historyHydrated,
    recordSignal,
    resolveSignals,
    signalStats,
    historyByCoin,
    calibration,
    equityCurve,
    drawdown,
    streaks,
    perCoin,
    frequency,
    resolutionWindow,
    setResolutionWindow,
    exportCSV,
    selectedSignal,
    setSelectedSignal,
    displaySignal,
    liveDims,
  };
}
