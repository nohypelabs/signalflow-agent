import type { TradingType } from "./trading-type";

export interface DimensionScore {
  score: number;
  detail?: string;
}

// Legacy action type (backward compat)
export type SignalAction = "LONG" | "SHORT" | "HOLD";

// V2 action types
export type SignalActionV2 =
  | "STRONG_LONG"
  | "LONG"
  | "WEAK_LONG"
  | "HOLD"
  | "WEAK_SHORT"
  | "SHORT"
  | "STRONG_SHORT";

export type MarketRegime =
  | "TRENDING_UP"
  | "TRENDING_DOWN"
  | "RANGING"
  | "VOLATILE"
  | "BREAKOUT";

export interface ConfluenceFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
  bullish: boolean;
}

export type Signal = {
  id: string;
  pair: string;
  action: SignalAction;
  confidence: number;
  price: number;
  change24h: number;
  reasoning: string;
  dimensions: SignalDimensions;
  dimensionDetails?: SignalDimensionDetails;
  execution: SignalExecution;
  sources: string[];
  timeAgo: string;
  // V2 extensions
  actionV2?: SignalActionV2;
  regime?: MarketRegime;
  factors?: ConfluenceFactor[];
  confluence?: number;
  tradingType?: TradingType;
  multiTF?: {
    score: number;
    details: { tf: string; action: string; direction: string; confidence: number }[];
  };
};

export interface SignalDimensions {
  etfFlow: number;
  sentiment: number;
  macro: number;
  momentum: number;
  treasury: number;
}

export interface SignalDimensionDetails {
  etfFlow: DimensionScore;
  sentiment: DimensionScore;
  macro: DimensionScore;
  momentum: DimensionScore;
  treasury: DimensionScore;
}

export interface SignalExecution {
  orderType: string;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  positionSize: string;
  riskReward: string;
}

export interface DimensionData {
  score: number;
  detail: string;
}

export interface LiveSignalDimensions {
  etfFlow: DimensionData;
  sentiment: DimensionData;
  macro: DimensionData;
  momentum: DimensionData;
  treasury: DimensionData;
}

export interface SignalsData {
  updated: number;
  signals?: Signal[];
  sources: Record<string, boolean | number>;
  dimensions: Record<string, LiveSignalDimensions>;
  overall?: Record<string, number>;
  weights?: Record<string, Record<string, number>>;
  capped?: Record<string, string[]>;
}

export interface RecordedSignal {
  id: string;
  pair: string;
  coin: string;
  action: SignalAction;
  confidence: number;
  price: number;
  timestamp: number;
  dimensions: SignalDimensions;
  resolved?: {
    correct: boolean;
    finalPrice: number;
    resolvedAt: number;
  };
}

export type PortfolioPoint = {
  day: number;
  value: number;
};

export interface SignalGenerationResult {
  baseSignal: Signal;
  aiThesis?: {
    reasoning: string;
    dimensionDetails: SignalDimensionDetails;
    execution: SignalExecution;
  };
  aiError?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  sources: string[];
  generated: number;
}
