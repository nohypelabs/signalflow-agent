// SignalFlow Agent — Trading Type System
// ─────────────────────────────────────────────────────────────
// Different trading styles require different signal parameters.
// Scalping: high-frequency, tight TP/SL, momentum-focused
// Intraday: balanced, moderate TP/SL, mixed factors
// Swing: trend-following, wider TP/SL, structure-focused
// Position: macro-driven, widest TP/SL, trend + fundamentals

import type React from "react";
import { Zap, BarChart3, TrendingUp, Landmark } from "lucide-react";

export type TradingType = "scalping" | "intraday" | "swing" | "position";

export interface TradingTypeConfig {
  id: TradingType;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>;
  description: string;
  timeframe: string;
  holdDuration: string;
  maxLeverage: number;
  defaultLeverage: number;
  minConfidence: number;
  riskRewardTarget: string;
  // ATR multipliers for TP/SL
  tpMultiplier: { min: number; max: number };
  slMultiplier: { min: number; max: number };
  // Factor weights (will be used in Phase 2)
  weights: {
    trend: number;
    momentum: number;
    volatility: number;
    volume: number;
    structure: number;
  };
  color: string;
  gradient: string;
}

export const TRADING_TYPES: Record<TradingType, TradingTypeConfig> = {
  scalping: {
    id: "scalping",
    label: "Scalper",
    icon: Zap,
    description: "High-frequency trades with tight risk management. Quick in, quick out.",
    timeframe: "1m – 15m",
    holdDuration: "< 1 hour",
    maxLeverage: 20,
    defaultLeverage: 5,
    minConfidence: 60,
    riskRewardTarget: "1.5:1 – 2:1",
    tpMultiplier: { min: 1.0, max: 1.5 },
    slMultiplier: { min: 0.5, max: 0.8 },
    weights: {
      trend: 10,
      momentum: 40,
      volatility: 25,
      volume: 20,
      structure: 5,
    },
    color: "#F59E0B",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  intraday: {
    id: "intraday",
    label: "Intraday",
    icon: BarChart3,
    description: "Balanced approach. Capture intraday moves with moderate risk.",
    timeframe: "1h – 4h",
    holdDuration: "1 – 6 hours",
    maxLeverage: 10,
    defaultLeverage: 3,
    minConfidence: 65,
    riskRewardTarget: "2:1 – 2.5:1",
    tpMultiplier: { min: 2.0, max: 2.5 },
    slMultiplier: { min: 1.0, max: 1.2 },
    weights: {
      trend: 25,
      momentum: 30,
      volatility: 20,
      volume: 15,
      structure: 10,
    },
    color: "#3B82F6",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  swing: {
    id: "swing",
    label: "Swing Trader",
    icon: TrendingUp,
    description: "Trend-following over days to weeks. Let winners run.",
    timeframe: "1D – 7D",
    holdDuration: "2 – 14 days",
    maxLeverage: 5,
    defaultLeverage: 2,
    minConfidence: 70,
    riskRewardTarget: "2.5:1 – 3:1",
    tpMultiplier: { min: 3.0, max: 4.0 },
    slMultiplier: { min: 1.2, max: 1.5 },
    weights: {
      trend: 35,
      momentum: 20,
      volatility: 10,
      volume: 10,
      structure: 25,
    },
    color: "#10B981",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
  position: {
    id: "position",
    label: "Position",
    icon: Landmark,
    description: "Long-term macro plays. Ride the big trends.",
    timeframe: "1W+",
    holdDuration: "2 – 8 weeks",
    maxLeverage: 3,
    defaultLeverage: 1,
    minConfidence: 75,
    riskRewardTarget: "3:1 – 5:1",
    tpMultiplier: { min: 4.0, max: 6.0 },
    slMultiplier: { min: 1.5, max: 2.0 },
    weights: {
      trend: 45,
      momentum: 10,
      volatility: 5,
      volume: 10,
      structure: 30,
    },
    color: "#8B5CF6",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
};

export const TRADING_TYPE_LIST = Object.values(TRADING_TYPES);

// localStorage key
export const TRADING_TYPE_STORAGE_KEY = "signalflow-trading-type";

// Load from localStorage (client-side only)
export function loadTradingType(): TradingType | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(TRADING_TYPE_STORAGE_KEY);
    if (saved && saved in TRADING_TYPES) return saved as TradingType;
  } catch {}
  return null;
}

// Save to localStorage
export function saveTradingType(type: TradingType): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRADING_TYPE_STORAGE_KEY, type);
  } catch {}
}

// Clear from localStorage
export function clearTradingType(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRADING_TYPE_STORAGE_KEY);
  } catch {}
}

// Get config for a type
export function getTradingTypeConfig(type: TradingType): TradingTypeConfig {
  return TRADING_TYPES[type];
}

// Determine recommended trading type based on market regime
export function getRecommendedType(regime: string): TradingType {
  switch (regime) {
    case "TRENDING_UP":
    case "TRENDING_DOWN":
      return "swing";
    case "RANGING":
      return "scalping";
    case "VOLATILE":
      return "intraday";
    case "BREAKOUT":
      return "intraday";
    default:
      return "intraday";
  }
}
