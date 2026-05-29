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
import type { SoDEXTicker, SoDEXNewOrderRequest, SoDEXOrder } from "./types/trade";
import type { AIConfig } from "./types/datasource";
import type { SignalsData } from "./hooks/useSignals";
import type { RecordedSignal } from "./hooks/useSignalHistory";
import { useMarket } from "./hooks/useMarket";
import { useSignals } from "./hooks/useSignals";
import { useSignalGeneration, type SignalPhase, type AIThesis } from "./hooks/useSignalGeneration";
import { useWallet } from "./hooks/useWallet";
import { useTradeExecution } from "./hooks/useTradeExecution";
import { useAIConfig } from "./hooks/useAIConfig";
import { useSignalHistory } from "./hooks/useSignalHistory";
import { getProvider } from "./ai-providers";
import { pairToSodexSymbol } from "./pair-map";

const DEFAULT_PAIR = "vBTC_vUSDC";

function pairToCoin(pair: string): string {
  return pair.split("/")[0];
}

export interface DashboardState {
  // Market
  tickers: SoDEXTicker[] | null;
  klines: import("./types/trade").SoDEXKline[] | null;
  marketLoading: boolean;
  marketError: string | null;
  sodexStatus: "connected" | "error" | "loading";
  tickerMap: Map<string, SoDEXTicker>;

  // Signals
  signalsData: SignalsData | null;
  liveSignals: Signal[];
  signalsLoading: boolean;
  signalsError: string | null;

  // AI config
  aiConfig: AIConfig;
  updateAIConfig: (u: Partial<AIConfig>) => void;
  aiProviderLabel: string;

  // AI signal generation
  aiSignal: Signal | null;
  baseSignal: Signal | null;
  aiThesis: AIThesis | null;
  aiError: import("./ai/providerErrors").AIError | null;
  signalPhase: SignalPhase;
  analyzing: boolean;
  includeAI: boolean;
  setIncludeAI: (v: boolean) => void;
  generate: (coin: string) => Promise<Signal | null>;
  clearAISignal: () => void;
  aiCoin: string;
  setAiCoin: (c: string) => void;

  // Wallet
  address: string | undefined;
  shortAddress: string | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Orders
  orders: SoDEXOrder[];
  ordersLoading: boolean;
  ordersError: string | null;
  refreshOrders: () => Promise<void>;
  placeOrder: (
    signedOrder: SoDEXNewOrderRequest & { signature?: string; userAddress?: string },
  ) => Promise<unknown>;
  cancelOrder: (id: number) => Promise<void>;
  openOrders: SoDEXOrder[];

  // Signal history
  history: RecordedSignal[];
  historyHydrated: boolean;
  recordSignal: (s: Signal) => void;
  resolveSignals: (coin: string, price: number) => void;
  signalStats: {
    totalResolved: number;
    totalCorrect: number;
    accuracy: number | null;
  };
  historyByCoin: (coin: string) => {
    total: number;
    correct: number;
    accuracy: number | null;
  };
  calibration: import("./hooks/useSignalHistory").CalibrationBucket[];
  equityCurve: import("./hooks/useSignalHistory").EquityPoint[];
  drawdown: import("./hooks/useSignalHistory").DrawdownResult;
  streaks: import("./hooks/useSignalHistory").StreakInfo;
  perCoin: import("./hooks/useSignalHistory").CoinAccuracy[];
  frequency: import("./hooks/useSignalHistory").FrequencyStats;
  resolutionWindow: import("./hooks/useSignalHistory").ResolutionWindow;
  setResolutionWindow: (w: import("./hooks/useSignalHistory").ResolutionWindow) => void;
  exportCSV: () => void;

  // Selected signal
  selectedSignal: Signal | null;
  setSelectedSignal: (s: Signal | null) => void;
  displaySignal: Signal | null;
  liveDims: import("./hooks/useSignals").SignalDimensions | null;

  // Trade form
  showTradeForm: boolean;
  executingSignal: Signal | null;
  executingTicker: SoDEXTicker | null;
  handleExecuteSignal: (signal: Signal) => void;
  handleExecuteOrder: (order: SoDEXNewOrderRequest) => Promise<void>;
  handleCloseForm: () => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  // ── Hooks ──

  // Market
  const { tickers, klines, loading: marketLoading, error: marketError } = useMarket(DEFAULT_PAIR);

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
  const generate = useCallback(async (coin: string) => {
    return generateRaw(coin, includeAI);
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
