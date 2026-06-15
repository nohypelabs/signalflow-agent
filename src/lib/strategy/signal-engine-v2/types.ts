// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import type { SignalDimensions, SignalDimensionDetails } from "../../types/signal";
import type { TradingType } from "../../types/trading-type";

export type MarketRegime = "TRENDING_UP" | "TRENDING_DOWN" | "RANGING" | "VOLATILE" | "BREAKOUT";

export type SignalActionV2 =
  | "STRONG_LONG"
  | "LONG"
  | "WEAK_LONG"
  | "HOLD"
  | "WEAK_SHORT"
  | "SHORT"
  | "STRONG_SHORT";

export type SignalDirection = "long" | "short" | "neutral";

export type SignalSetupType =
  | "trend_continuation"
  | "breakout"
  | "mean_reversion"
  | "range_trade"
  | "no_edge";

export interface ConfluenceFactor {
  name: "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE" | "ORDER_FLOW" | "DEPTH" | "FUNDING" | "SMC_STRUCTURE" | "SNIPER_ENTRY";
  score: number;         // 0-100
  weight: number;        // 0.0 - 1.0 (fraction of total)
  detail: string;
  bullish: boolean;      // true if score > 50 (net bullish)
}

export interface ConfluenceResult {
  score: number;                     // Weighted confluence 0-100
  factors: ConfluenceFactor[];
  bullishCount: number;              // How many factors have score > 60
  bearishCount: number;              // How many factors have score < 40
}

export interface SignalSetup {
  type: SignalSetupType;
  direction: SignalDirection;
  label: string;
  thesis: string;
  invalidation: string;
  evidence: string[];
  confidenceBias: number;
}

export interface StrategyLesson {
  setupType: SignalSetupType;
  regime: MarketRegime | "ANY";
  tradingType?: TradingType | "ANY";
  source: "baseline_rule" | "backtest" | "paper";
  sampleSize: number;
  winRate: number | null;
  profitFactor: number | null;
  confidenceAdjustment: number;
  minConfidence: number;
  status: "trusted" | "watch" | "blocked";
  note: string;
}

export interface SignalQuality {
  rawConfidence: number;
  calibratedConfidence: number;
  confidenceAdjustment: number;
  minConfidence: number;
  status: "actionable" | "watch" | "blocked";
  blockedReasons: string[];
  lesson: StrategyLesson;
}

export interface SignalV2 {
  id: string;
  pair: string;
  action: SignalActionV2;
  confidence: number;          // 0-100
  price: number;
  change24h: number;
  reasoning: string;
  regime: MarketRegime;
  factors: ConfluenceFactor[];
  confluence: number;          // Overall confluence score
  tradingType?: TradingType;   // Which type profile was used
  setup: SignalSetup;
  quality: SignalQuality;
  // Backward-compatible dimension structure
  dimensions: SignalDimensions;
  dimensionDetails: SignalDimensionDetails;
  execution: {
    orderType: string;
    entry: number;
    takeProfit: number;
    stopLoss: number;
    riskReward: string;
    positionSize: string;
  };
  sources: string[];
  timeAgo: string;
  // New: Trace from Thinking Framework for auditability (Wave 2 focus on verifiable reasoning)
  frameworkApplication?: {
    tradingType: TradingType;
    principlesApplied: string[];
    note: string;
  };
}
