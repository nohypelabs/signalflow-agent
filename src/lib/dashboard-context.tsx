"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Signal } from "./types/signal";
import type { SoDEXTicker } from "./types/trade";
import { useMarket } from "./hooks/useMarket";
import { useSignals } from "./hooks/useSignals";
import { useSignalGeneration } from "./hooks/useSignalGeneration";
import { useWallet } from "./hooks/useWallet";
import { useTradeExecution } from "./hooks/useTradeExecution";
import { useAIConfig } from "./hooks/useAIConfig";
import { useSignalHistory } from "./hooks/useSignalHistory";
import { getProvider } from "./ai-providers";
import { pairToSodexSymbol } from "./pair-map";
import type { DashboardState } from "./dashboard/types";

const DEFAULT_PAIR = "vBTC_vUSDC";

function pairToCoin(pair: string): string {
  return pair.split("/")[0];
}


const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  // ── Hooks ──

  // Selected pair (display format e.g. "BTC/USDC")
  const [selectedPair, setSelectedPair] = useState("BTC/USDC");
  const selectedPairDisplay = selectedPair;
  const sodexSymbol = pairToSodexSymbol(selectedPair) || DEFAULT_PAIR;

  // Market — klines follow selected pair, tickers always fetch all
  const { tickers, klines, loading: marketLoading, error: marketError } = useMarket(sodexSymbol);

  // Signals
  const {
    data: signalsData,
    loading: signalsLoading,
    error: signalsError,
  } = useSignals();

  // Wallet
  const {
    address,
    shortAddress,
    isConnected,
    chainId,
    connect: connectWallet,
    disconnect: disconnectWallet,
  } = useWallet();

  // AI config
  const { config: aiConfig, update: updateAIConfig } = useAIConfig();
  const aiProviderLabel = getProvider(aiConfig.providerId)?.name || "Deepseek";

  // AI signal generation
  const {
    phase: signalPhase,
    baseSignal,
    aiThesis,
    aiError,
    analyzing,
    generate: generateRaw,
    clear: clearAISignal,
  } = useSignalGeneration(aiConfig);
  const [aiCoin, setAiCoin] = useState("BTC");
  const [includeAI, setIncludeAI] = useState(true);

  // aiSignal = baseSignal (always available when generation succeeds)
  const aiSignal = baseSignal;

  // Wrapped generate that passes includeAI
  const generate = useCallback(async (coin: string, includeAIOverride?: boolean) => {
    return generateRaw(coin, includeAIOverride ?? includeAI);
  }, [generateRaw, includeAI]);

  // Signal history
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

  // Orders (renamed hook)
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders,
    placeOrder,
    cancel: cancelOrder,
  } = useTradeExecution(true);

  // ── Local state ──

  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [executingSignal, setExecutingSignal] = useState<Signal | null>(null);

  // ── Derived state ──

  const displaySignal = aiSignal ?? selectedSignal;

  const liveDims =
    signalsData && displaySignal
      ? signalsData.dimensions[pairToCoin(displaySignal.pair)] ?? null
      : null;

  // Live TA signals from the API
  const liveSignals: Signal[] = signalsData?.signals ?? [];

  const sodexStatus: "connected" | "error" | "loading" =
    marketLoading ? "loading" : marketError ? "error" : tickers ? "connected" : "loading";

  // Ticker map
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  // Find ticker for the executing signal
  const executingSodSym = executingSignal ? pairToSodexSymbol(executingSignal.pair) : "";
  const executingTicker = executingSodSym ? tickerMap.get(executingSodSym) ?? null : null;

  // Open orders
  const openOrders = orders.filter(
    (o) => o.status === "NEW" || o.status === "PARTIALLY_FILLED",
  );

  // ── Resolve pending signals ──

  const resolvePending = useCallback(() => {
    if (!tickers || !historyHydrated) return;
    for (const t of tickers) {
      const pair = t.symbol;
      const coin = pair.startsWith("v") ? pair.split("_")[0].replace("v", "") : pair.split("_")[0];
      const price = parseFloat(t.lastPx);
      if (coin && !Number.isNaN(price)) {
        resolveSignals(coin, price);
      }
    }
  }, [tickers, historyHydrated, resolveSignals]);

  useEffect(() => {
    resolvePending();
  }, [resolvePending]);

  // ── Trade execution callbacks ──

  const handleExecuteSignal = useCallback((signal: Signal) => {
    setExecutingSignal(signal);
    setShowTradeForm(true);
  }, []);

  const handleExecuteOrder = useCallback(
    async () => {
      await refreshOrders();
    },
    [refreshOrders],
  );

  const handleCloseForm = useCallback(() => {
    setShowTradeForm(false);
    setExecutingSignal(null);
  }, []);

  // ── Context value ──

  const value: DashboardState = {
    tickers,
    klines,
    marketLoading,
    marketError,
    sodexStatus,
    tickerMap,
    selectedPair,
    selectedPairDisplay,
    setSelectedPair,
    signalsData,
    liveSignals,
    signalsLoading,
    signalsError,
    aiConfig,
    updateAIConfig,
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
    address,
    shortAddress,
    isConnected,
    chainId,
    connectWallet,
    disconnectWallet,
    orders,
    ordersLoading,
    ordersError,
    refreshOrders,
    placeOrder,
    cancelOrder,
    openOrders,
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
    showTradeForm,
    executingSignal,
    executingTicker,
    handleExecuteSignal,
    handleExecuteOrder,
    handleCloseForm,
  };

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
