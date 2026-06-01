// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import type { MarketRegime } from "./types";

export function detectRegime(
  closes: number[],
  highs: number[],
  lows: number[],
  adxVal: number,
  bbWidth: number,
  atrVal: number,
  atrAvg: number,
  ema20: number,
  ema50: number,
  ema200: number,
): MarketRegime {
  // Trending: ADX > 25 with EMA alignment
  const trendingUp = adxVal > 25 && ema20 > ema50 && ema50 > ema200;
  const trendingDown = adxVal > 25 && ema20 < ema50 && ema50 < ema200;

  // Volatile: ATR significantly above average OR high BB width
  const atrRatio = atrAvg > 0 ? atrVal / atrAvg : 1;
  const isVolatile = atrRatio > 1.5 || bbWidth > 8;

  // Breakout: price making new high/low with expanding volatility
  const recentHigh = Math.max(...closes.slice(-20));
  const recentLow = Math.min(...closes.slice(-20));
  const currentPrice = closes[closes.length - 1];
  const isBreakout =
    (currentPrice >= recentHigh * 0.995 || currentPrice <= recentLow * 1.005) &&
    atrRatio > 1.2 &&
    adxVal > 20;

  if (isBreakout && trendingUp) return "BREAKOUT";
  if (isBreakout && trendingDown) return "BREAKOUT";
  if (isVolatile && !trendingUp && !trendingDown) return "VOLATILE";
  if (trendingUp) return "TRENDING_UP";
  if (trendingDown) return "TRENDING_DOWN";

  // Default: RANGING
  return "RANGING";
}
