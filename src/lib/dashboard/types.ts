import type { Signal } from "../types/signal";
import type { SoDEXTicker, SoDEXNewOrderRequest, SoDEXOrder } from "../types/trade";
import type { AIConfig } from "../types/datasource";
import type { SignalsData } from "../hooks/useSignals";
import type { RecordedSignal } from "../hooks/useSignalHistory";
import type { SignalPhase, AIThesis } from "../hooks/useSignalGeneration";

export interface DashboardState {
  // Market
  tickers: SoDEXTicker[] | null;
  klines: import("../types/trade").SoDEXKline[] | null;
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
  aiError: import("../ai/providerErrors").AIError | null;
  signalPhase: SignalPhase;
  analyzing: boolean;
  includeAI: boolean;
  setIncludeAI: (v: boolean) => void;
  generate: (coin: string, includeAIOverride?: boolean, strategySerialized?: string) => Promise<Signal | null>;
  clearAISignal: () => void;
  aiCoin: string;
  setAiCoin: (c: string) => void;

  // Wallet
  address: string | undefined;
  shortAddress: string | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  disconnectWallet: () => void;

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
  calibration: import("../hooks/useSignalHistory").CalibrationBucket[];
  equityCurve: import("../hooks/useSignalHistory").EquityPoint[];
  drawdown: import("../hooks/useSignalHistory").DrawdownResult;
  streaks: import("../hooks/useSignalHistory").StreakInfo;
  perCoin: import("../hooks/useSignalHistory").CoinAccuracy[];
  frequency: import("../hooks/useSignalHistory").FrequencyStats;
  resolutionWindow: import("../hooks/useSignalHistory").ResolutionWindow;
  setResolutionWindow: (w: import("../hooks/useSignalHistory").ResolutionWindow) => void;
  exportCSV: () => void;

  // Selected pair (display format e.g. "BTC/USDC")
  selectedPair: string;
  selectedPairDisplay: string;
  setSelectedPair: (pair: string) => void;

  // Selected signal
  selectedSignal: Signal | null;
  setSelectedSignal: (s: Signal | null) => void;
  displaySignal: Signal | null;
  liveDims: import("../hooks/useSignals").SignalDimensions | null;

  // Trade form
  showTradeForm: boolean;
  executingSignal: Signal | null;
  executingTicker: SoDEXTicker | null;
  handleExecuteSignal: (signal: Signal) => void;
  handleExecuteOrder: (order: SoDEXNewOrderRequest) => Promise<void>;
  handleCloseForm: () => void;
}
