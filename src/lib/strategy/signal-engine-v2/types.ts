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

export interface ConfluenceFactor {
  name: "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE";
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
}
