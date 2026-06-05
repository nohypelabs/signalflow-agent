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
  const price = closes[closes.length - 1];

  // Relaxed trending detection for real crypto markets:
  // - Strong ADX (>25) + full stack still preferred.
  // - Moderate ADX (>20) + partial alignment or price on correct side of EMA50/200 is enough.
  // This prevents healthy trends (ADX 18-24 common on 1H) from being misclassified as RANGING.
  const adxStrong = adxVal > 25;
  const adxModerate = adxVal > 20;
  const adxWeak = adxVal > 18;

  const emaBullStack = ema20 > ema50 && ema50 > ema200;
  const emaBearStack = ema20 < ema50 && ema50 < ema200;

  // Partial alignment: short-term or price confirmation
  const emaBullPartial = ema20 > ema50 || ema50 > ema200 || (price > ema50 && price > ema200);
  const emaBearPartial = ema20 < ema50 || ema50 < ema200 || (price < ema50 && price < ema200);

  const trendingUp = (adxStrong && emaBullStack) || (adxModerate && emaBullPartial) || (adxWeak && price > ema200);
  const trendingDown = (adxStrong && emaBearStack) || (adxModerate && emaBearPartial) || (adxWeak && price < ema200);

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
    adxVal > 18; // slightly relaxed

  if (isBreakout && trendingUp) return "BREAKOUT";
  if (isBreakout && trendingDown) return "BREAKOUT";
  if (isVolatile && !trendingUp && !trendingDown) return "VOLATILE";
  if (trendingUp) return "TRENDING_UP";
  if (trendingDown) return "TRENDING_DOWN";

  // Default: RANGING
  return "RANGING";
}
