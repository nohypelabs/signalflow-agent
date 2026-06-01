// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import { TRADING_TYPES, type TradingType } from "../../types/trading-type";
import type { MarketRegime, SignalActionV2 } from "./types";

export interface TPSLResult {
  orderType: string;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  riskReward: string;
  positionSize: string;
}

export function calculateTPSL(
  price: number,
  atrVal: number,
  action: SignalActionV2,
  regime: MarketRegime,
  tradingType?: TradingType,
): TPSLResult {
  const isHold = action === "HOLD";
  const atrPct = price > 0 ? (atrVal / price) * 100 : 2;

  // ATR multipliers per regime (defaults)
  const regimeMultipliers: Record<MarketRegime, { tpLong: number; slLong: number; tpShort: number; slShort: number }> = {
    TRENDING_UP:   { tpLong: 3.0, slLong: 1.2, tpShort: 2.0, slShort: 1.0 },
    TRENDING_DOWN: { tpLong: 2.0, slLong: 1.0, tpShort: 3.0, slShort: 1.2 },
    RANGING:       { tpLong: 1.5, slLong: 0.8, tpShort: 1.5, slShort: 0.8 },
    VOLATILE:      { tpLong: 2.5, slLong: 1.5, tpShort: 2.5, slShort: 1.5 },
    BREAKOUT:      { tpLong: 3.5, slLong: 1.3, tpShort: 3.0, slShort: 1.3 },
  };

  // If tradingType is specified, blend type multipliers with regime
  let m = regimeMultipliers[regime];
  if (tradingType) {
    const typeConfig = TRADING_TYPES[tradingType];

    // Regime factor: trending/breakout → use max of type range; ranging → use min
    const regimeFactor = regime === "TRENDING_UP" || regime === "TRENDING_DOWN" || regime === "BREAKOUT"
      ? 1.0   // use max of type range (wider TP)
      : regime === "RANGING"
        ? 0.0   // use min of type range (tighter TP)
        : 0.5;  // volatile → use mid

    const tpMult = typeConfig.tpMultiplier.min + (typeConfig.tpMultiplier.max - typeConfig.tpMultiplier.min) * regimeFactor;
    const slMult = typeConfig.slMultiplier.min + (typeConfig.slMultiplier.max - typeConfig.slMultiplier.min) * regimeFactor;

    m = {
      tpLong: tpMult,
      slLong: slMult,
      tpShort: tpMult,
      slShort: slMult,
    };
  }

  const isBuy = action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG";
  const isSell = action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT";

  let takeProfit: number;
  let stopLoss: number;
  let posSize: string;

  if (isBuy) {
    takeProfit = price * (1 + (m.tpLong * atrPct) / 100);
    stopLoss = price * (1 - (m.slLong * atrPct) / 100);
    // Position sizing based on action strength
    posSize = action === "STRONG_LONG" ? "3-5%" : action === "LONG" ? "2-4%" : "1-2%";
  } else if (isSell) {
    takeProfit = price * (1 - (m.tpShort * atrPct) / 100);
    stopLoss = price * (1 + (m.slShort * atrPct) / 100);
    posSize = action === "STRONG_SHORT" ? "3-5%" : action === "SHORT" ? "2-4%" : "1-2%";
  } else {
    // HOLD — show a neutral range
    takeProfit = price * (1 + (1.0 * atrPct) / 100);
    stopLoss = price * (1 - (0.75 * atrPct) / 100);
    posSize = "0% (hold)";
  }

  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(takeProfit - price);
  const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : "—";

  return {
    orderType: isHold ? "Limit" : "Market",
    entry: price,
    takeProfit: parseFloat(takeProfit.toFixed(6)),
    stopLoss: parseFloat(stopLoss.toFixed(6)),
    riskReward: `${rrRatio}:1`,
    positionSize: posSize,
  };
}
