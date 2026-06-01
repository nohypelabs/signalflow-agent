"use client";

import { useCallback, useEffect, useState } from "react";
import type { Signal } from "../types/signal";
import type { AIConfig } from "../types/datasource";
import { getProvider } from "../ai-providers";
import { useSignals } from "../hooks/useSignals";
import { useSignalGeneration } from "../hooks/useSignalGeneration";
import { useSignalHistory } from "../hooks/useSignalHistory";

function pairToCoin(pair: string): string {
  return pair.split("/")[0];
}

export function useSignalProviderState(
  aiConfig: AIConfig,
  tickers: { symbol: string; lastPx: string }[] | null,
) {
  const { data: signalsData, loading: signalsLoading, error: signalsError } = useSignals();

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
  const liveSignals: Signal[] = signalsData?.signals ?? [];
  const liveDims =
    signalsData && displaySignal
      ? signalsData.dimensions[pairToCoin(displaySignal.pair)] ?? null
      : null;

  const aiProviderLabel = getProvider(aiConfig.providerId)?.name || "Deepseek";

  const generate = useCallback(async (coin: string, includeAIOverride?: boolean) => {
    return generateRaw(coin, includeAIOverride ?? includeAI);
  }, [generateRaw, includeAI]);

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
