// SignalFlow Agent — Multi-Factor Confluence Signal Engine V2
// ─────────────────────────────────────────────────────────────
// Architecture:
//   LAYER 1: Market Regime Detection
//   LAYER 2: Multi-Factor Confluence Scoring (5 factors)
//   LAYER 3: Signal Classification (7 tiers)
//   LAYER 4: Volatility-Adjusted TP/SL (ATR multipliers)
//   LAYER 5: Filtering (minimum confluence gates)

import { sma, ema, rsi, macd, bollingerBands, atr, last } from "./indicators";
import type { SignalDimensions, SignalDimensionDetails, SignalExecution } from "../types/signal";
import type { NewsItem, ETFSummaryItem, MacroEvent, MarketSnapshot, BTCPurchaseHistory } from "../sosovalue";
import type { SoDEXKline } from "../sodex-types";

// ═══════════════════════════════════════════════════════════════
// NEW INDICATORS (not in indicators.ts yet)
// ═══════════════════════════════════════════════════════════════

/**
 * Average Directional Index (Wilder's ADX, period=14)
 * Returns: { adx[], plusDI[], minusDI[] }
 */
export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const len = closes.length;
  const plusDM: number[] = [NaN];
  const minusDM: number[] = [NaN];
  const trArr: number[] = [highs[0] - lows[0]];

  // Step 1: Compute +DM, -DM, and True Range per bar
  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }

    trArr.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      ),
    );
  }

  // Step 2: Smooth +DM, -DM, TR using Wilder's smoothing (period-1 smoothing)
  const smoothedPlusDM: number[] = [];
  const smoothedMinusDM: number[] = [];
  const smoothedTR: number[] = [];

  for (let i = 0; i < len; i++) {
    if (i < period - 1) {
      smoothedPlusDM.push(NaN);
      smoothedMinusDM.push(NaN);
      smoothedTR.push(NaN);
      continue;
    }

    if (i === period - 1) {
      let sumPDM = 0, sumMDM = 0, sumTR = 0;
      for (let j = 0; j <= i; j++) {
        sumPDM += plusDM[j];
        sumMDM += minusDM[j];
        sumTR += trArr[j];
      }
      smoothedPlusDM.push(sumPDM);
      smoothedMinusDM.push(sumMDM);
      smoothedTR.push(sumTR);
    } else {
      smoothedPlusDM.push(smoothedPlusDM[i - 1] - smoothedPlusDM[i - 1] / period + plusDM[i]);
      smoothedMinusDM.push(smoothedMinusDM[i - 1] - smoothedMinusDM[i - 1] / period + minusDM[i]);
      smoothedTR.push(smoothedTR[i - 1] - smoothedTR[i - 1] / period + trArr[i]);
    }
  }

  // Step 3: Compute +DI, -DI, DX
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dxArr: number[] = [];

  for (let i = 0; i < len; i++) {
    if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
      plusDI.push(NaN);
      minusDI.push(NaN);
      dxArr.push(NaN);
      continue;
    }

    const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    plusDI.push(pdi);
    minusDI.push(mdi);

    const diSum = pdi + mdi;
    dxArr.push(diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100);
  }

  // Step 4: Smooth DX over `period` to get ADX
  const adxArr: number[] = [];
  let adxStart = -1;
  let validDxCount = 0;

  for (let i = 0; i < len; i++) {
    if (!isNaN(dxArr[i])) {
      validDxCount++;
      if (adxStart === -1) adxStart = i;
    }

    if (isNaN(dxArr[i])) {
      adxArr.push(NaN);
    } else if (validDxCount < period) {
      adxArr.push(NaN);
    } else if (validDxCount === period) {
      // First ADX value: simple average of first `period` DX values
      let sum = 0;
      let count = 0;
      for (let j = adxStart; j <= i; j++) {
        if (!isNaN(dxArr[j])) {
          sum += dxArr[j];
          count++;
        }
      }
      adxArr.push(count > 0 ? sum / count : NaN);
    } else {
      // Wilder's smoothing: ADX = ((prevADX * (period-1)) + currentDX) / period
      const prevADX = adxArr[i - 1];
      if (!isNaN(prevADX)) {
        adxArr.push((prevADX * (period - 1) + dxArr[i]) / period);
      } else {
        adxArr.push(NaN);
      }
    }
  }

  return { adx: adxArr, plusDI, minusDI };
}

/**
 * On Balance Volume (OBV)
 * close[i] > close[i-1] => OBV += volume[i]
 * close[i] < close[i-1] => OBV -= volume[i]
 * close[i] == close[i-1] => OBV unchanged
 */
export function obv(closes: number[], volumes: number[]): number[] {
  const result: number[] = [0]; // OBV starts at 0 for the first bar

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      result.push(result[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      result.push(result[i - 1] - volumes[i]);
    } else {
      result.push(result[i - 1]);
    }
  }

  return result;
}

/**
 * Rate of Change (ROC): ((price - prevPrice) / prevPrice) * 100
 */
export function roc(closes: number[], period = 12): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period || closes[i - period] === 0) {
      result.push(NaN);
    } else {
      result.push(((closes[i] - closes[i - period]) / closes[i - period]) * 100);
    }
  }
  return result;
}

/**
 * Find support and resistance levels using local swing highs/lows.
 * Returns: { supports: number[], resistances: number[] }
 */
export function findSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 5,
): { supports: number[]; resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];

  // Identify swing lows (support) and swing highs (resistance)
  for (let i = lookback; i < highs.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isSwingHigh = false;
      if (lows[j] <= lows[i]) isSwingLow = false;
    }

    if (isSwingHigh) resistances.push(highs[i]);
    if (isSwingLow) supports.push(lows[i]);
  }

  // If we don't have enough levels, add recent high/low as fallback
  const recentCloses = closes.slice(-60);
  if (resistances.length === 0) {
    resistances.push(Math.max(...recentCloses));
  }
  if (supports.length === 0) {
    supports.push(Math.min(...recentCloses));
  }

  return { supports, resistances };
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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

// Internal normalized kline
interface NormalizedKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
}

// ═══════════════════════════════════════════════════════════════
// LAYER 0: NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function normalizeKlines(klines: SoDEXKline[]): NormalizedKline[] {
  return klines.map((k) => ({
    time: typeof k.t === "string" ? parseInt(k.t, 10) : k.t,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
    quoteVolume: parseFloat(k.q),
  }));
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1: MARKET REGIME DETECTION
// ═══════════════════════════════════════════════════════════════

function detectRegime(
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
  const range = recentHigh - recentLow;
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

// ═══════════════════════════════════════════════════════════════
// LAYER 2: CONFLUENCE FACTOR SCORING
// ═══════════════════════════════════════════════════════════════

function scoreTrend(
  closes: number[],
  adxResult: { adx: number[]; plusDI: number[]; minusDI: number[] },
): ConfluenceFactor {
  const ema9 = last(ema(closes, 9));
  const ema21 = last(ema(closes, 21));
  const ema50 = last(ema(closes, 50));
  const price = closes[closes.length - 1];
  const adxVal = last(adxResult.adx);
  const plusDIVal = last(adxResult.plusDI);
  const minusDIVal = last(adxResult.minusDI);

  let score = 50; // neutral base

  // EMA alignment scoring (up to ±30 points)
  // Perfect bullish alignment: EMA9 > EMA21 > EMA50
  if (!isNaN(ema9) && !isNaN(ema21) && !isNaN(ema50)) {
    if (ema9 > ema21 && ema21 > ema50) {
      score += 25; // Perfect bullish alignment
    } else if (ema9 < ema21 && ema21 < ema50) {
      score -= 25; // Perfect bearish alignment
    } else if (ema9 > ema21) {
      score += 10; // Short-term bullish
    } else if (ema9 < ema21) {
      score -= 10; // Short-term bearish
    }

    // Price position relative to EMAs (up to ±10 points)
    const aboveAll = price > ema9 && price > ema21 && price > ema50;
    const belowAll = price < ema9 && price < ema21 && price < ema50;
    if (aboveAll) score += 10;
    else if (belowAll) score -= 10;
  }

  // ADX strength + direction (up to ±20 points)
  if (!isNaN(adxVal) && !isNaN(plusDIVal) && !isNaN(minusDIVal)) {
    const diDiff = plusDIVal - minusDIVal;
    if (adxVal > 25) {
      // Strong trend: amplify direction signal
      score += Math.sign(diDiff) * Math.min(15, Math.abs(diDiff) * 0.3);
    } else if (adxVal > 20) {
      score += Math.sign(diDiff) * Math.min(8, Math.abs(diDiff) * 0.15);
    }
    // ADX between 20-25: weak trend, slight bonus for any direction
    if (adxVal > 20) {
      score += diDiff > 0 ? 3 : -3;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const emaLabel = !isNaN(ema9) && !isNaN(ema21)
    ? (ema9 > ema21 ? "bullish" : "bearish")
    : "neutral";
  const adxLabel = !isNaN(adxVal) ? `ADX ${adxVal.toFixed(1)}` : "ADX N/A";
  const detail = `EMA9/21/50 alignment: ${emaLabel}. ${adxLabel}. ` +
    `+DI ${!isNaN(plusDIVal) ? plusDIVal.toFixed(1) : "N/A"}, ` +
    `-DI ${!isNaN(minusDIVal) ? minusDIVal.toFixed(1) : "N/A"}.`;

  return { name: "TREND", score, weight: 0.30, detail, bullish: score > 50 };
}

function scoreMomentum(closes: number[]): ConfluenceFactor {
  const rsiVals = rsi(closes, 14);
  const rsiValue = last(rsiVals);

  const { macd: macdLine, signal: signalLine, histogram } = macd(closes, 12, 26, 9);
  const macdHist = last(histogram);
  const macdLineVal = last(macdLine);
  const macdSignalVal = last(signalLine);

  const rocVals = roc(closes, 12);
  const rocValue = last(rocVals);

  let score = 50; // neutral base

  // RSI scoring (up to ±25 points)
  if (!isNaN(rsiValue)) {
    if (rsiValue < 30) {
      score += 20 + (30 - rsiValue) * 0.5; // Oversold → bullish
    } else if (rsiValue < 40) {
      score += 10 + (40 - rsiValue) * 0.8;
    } else if (rsiValue > 70) {
      score -= 20 + (rsiValue - 70) * 0.5; // Overbought → bearish
    } else if (rsiValue > 60) {
      score -= 10 + (rsiValue - 60) * 0.8;
    }
    // 40-60: neutral, no adjustment
  }

  // MACD histogram scoring (up to ±15 points)
  if (!isNaN(macdHist)) {
    // Histogram direction
    const prevHist = histogram.length >= 2 ? histogram[histogram.length - 2] : NaN;
    if (!isNaN(prevHist)) {
      if (macdHist > 0 && macdHist > prevHist) {
        score += 15; // Bullish and accelerating
      } else if (macdHist > 0) {
        score += 8;  // Bullish but decelerating
      } else if (macdHist < 0 && macdHist < prevHist) {
        score -= 15; // Bearish and accelerating
      } else if (macdHist < 0) {
        score -= 8;  // Bearish but decelerating
      }
    } else {
      score += macdHist > 0 ? 10 : macdHist < 0 ? -10 : 0;
    }

    // MACD crossover check
    if (!isNaN(macdLineVal) && !isNaN(macdSignalVal)) {
      const prevMacdLine = macdLine.length >= 2 ? macdLine[macdLine.length - 2] : NaN;
      const prevSignal = signalLine.length >= 2 ? signalLine[signalLine.length - 2] : NaN;
      if (!isNaN(prevMacdLine) && !isNaN(prevSignal)) {
        const prevDiff = prevMacdLine - prevSignal;
        const currDiff = macdLineVal - macdSignalVal;
        if (prevDiff <= 0 && currDiff > 0) score += 5; // Bullish crossover
        if (prevDiff >= 0 && currDiff < 0) score -= 5; // Bearish crossover
      }
    }
  }

  // ROC scoring (up to ±10 points)
  if (!isNaN(rocValue)) {
    score += Math.max(-10, Math.min(10, rocValue * 1.5));
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const rsiLabel = !isNaN(rsiValue)
    ? (rsiValue < 30 ? "oversold" : rsiValue > 70 ? "overbought" : "neutral")
    : "N/A";
  const macdLabel = !isNaN(macdHist)
    ? (macdHist > 0 ? "bullish" : "bearish")
    : "N/A";
  const rocLabel = !isNaN(rocValue) ? `${rocValue > 0 ? "+" : ""}${rocValue.toFixed(2)}%` : "N/A";

  const detail = `RSI ${!isNaN(rsiValue) ? rsiValue.toFixed(1) : "N/A"} (${rsiLabel}). ` +
    `MACD histogram ${macdLabel} (${!isNaN(macdHist) ? macdHist.toFixed(4) : "N/A"}). ` +
    `ROC(12) ${rocLabel}.`;

  return { name: "MOMENTUM", score, weight: 0.25, detail, bullish: score > 50 };
}

function scoreVolatility(
  closes: number[],
  highs: number[],
  lows: number[],
): ConfluenceFactor {
  const bb = bollingerBands(closes, 20, 2);
  const bbPercentB = last(bb.percentB);
  const bbWidth = last(bb.width);

  const atrArr = atr(highs, lows, closes, 14);
  const atrVal = last(atrArr);

  // Compute ATR average (SMA of ATR over last 50 bars)
  const validAtr = atrArr.filter((v) => !isNaN(v));
  const atrAvg = validAtr.length >= 50
    ? validAtr.slice(-50).reduce((s, v) => s + v, 0) / Math.min(50, validAtr.length)
    : validAtr.reduce((s, v) => s + v, 0) / (validAtr.length || 1);

  // BB width average for squeeze detection
  const validBbWidth = bb.width.filter((v) => !isNaN(v));
  const bbWidthAvg = validBbWidth.length > 0
    ? validBbWidth.slice(-50).reduce((s, v) => s + v, 0) / Math.min(50, validBbWidth.length)
    : 0;

  let score = 50; // neutral base

  // BB %B position (up to ±25 points)
  // %B < 0 → price below lower band (oversold, bullish)
  // %B > 1 → price above upper band (overbought, bearish)
  if (!isNaN(bbPercentB)) {
    if (bbPercentB < 0) {
      score += 20 + Math.min(5, Math.abs(bbPercentB) * 25);
    } else if (bbPercentB < 0.2) {
      score += 15;
    } else if (bbPercentB > 1) {
      score -= 20 + Math.min(5, (bbPercentB - 1) * 25);
    } else if (bbPercentB > 0.8) {
      score -= 15;
    } else {
      // Within bands: slight lean toward mean reversion
      score += (0.5 - bbPercentB) * 10;
    }
  }

  // ATR relative to average (up to ±15 points)
  // High ATR relative to avg = increased volatility → caution
  // But if at extremes (oversold/overbought), high vol can mean reversal
  if (!isNaN(atrVal) && atrAvg > 0) {
    const atrRatio = atrVal / atrAvg;
    if (atrRatio > 1.5) {
      // Very high volatility: if price at band extremes, potential reversal
      if (!isNaN(bbPercentB) && (bbPercentB < 0.2 || bbPercentB > 0.8)) {
        score += bbPercentB < 0.2 ? 10 : -10; // Reversal opportunity
      } else {
        score -= 8; // High vol in the middle = caution
      }
    } else if (atrRatio < 0.7) {
      // Low volatility: squeeze building → could break either way
      // Slight neutral-positive bias (squeeze breaks tend to continue trend)
      score += 3;
    }
  }

  // BB width squeeze detection (up to ±10 points)
  if (!isNaN(bbWidth) && bbWidthAvg > 0) {
    const widthRatio = bbWidth / bbWidthAvg;
    if (widthRatio < 0.6) {
      // Tight squeeze: potential breakout coming
      score += 5; // Slight bullish bias for squeeze (tends to break up in crypto)
    } else if (widthRatio > 1.5) {
      // Expanding bands: trend in motion
      score -= 5; // Expansion already happened, less edge
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const squeezeLabel = !isNaN(bbWidth) && bbWidthAvg > 0 && bbWidth / bbWidthAvg < 0.6
    ? "SQUEEZE DETECTED"
    : "normal";
  const detail = `BB %B ${!isNaN(bbPercentB) ? bbPercentB.toFixed(3) : "N/A"}. ` +
    `BB Width ${!isNaN(bbWidth) ? bbWidth.toFixed(2) : "N/A"} (${squeezeLabel}). ` +
    `ATR ${!isNaN(atrVal) ? atrVal.toFixed(4) : "N/A"}`;

  return { name: "VOLATILITY", score, weight: 0.15, detail, bullish: score > 50 };
}

function scoreVolume(
  closes: number[],
  volumes: number[],
): ConfluenceFactor {
  // Volume vs 20-period average
  const volSma = sma(volumes, 20);
  const currentVol = volumes[volumes.length - 1];
  const avgVol = last(volSma);

  // Volume trend: compare last 5-bar average vs previous 5-bar average
  const recentVol5 = volumes.slice(-5);
  const prevVol5 = volumes.slice(-10, -5);
  const recentAvg = recentVol5.reduce((s, v) => s + v, 0) / recentVol5.length;
  const prevAvg = prevVol5.length > 0
    ? prevVol5.reduce((s, v) => s + v, 0) / prevVol5.length
    : recentAvg;

  // OBV
  const obvArr = obv(closes, volumes);
  const obvCurrent = obvArr[obvArr.length - 1];
  const obvPrev = obvArr.length > 5 ? obvArr[obvArr.length - 6] : obvArr[0];
  const obvDirection = obvCurrent - obvPrev;

  let score = 50; // neutral base

  // Volume vs average (up to ±15 points)
  // High volume confirms moves; high volume + price up = bullish; high volume + price down = bearish
  if (!isNaN(avgVol) && avgVol > 0) {
    const volRatio = currentVol / avgVol;
    const priceChange = closes.length >= 2
      ? closes[closes.length - 1] - closes[closes.length - 2]
      : 0;

    if (volRatio > 1.5) {
      // High volume: direction depends on price action
      score += priceChange > 0 ? 15 : priceChange < 0 ? -15 : 5;
    } else if (volRatio > 1.2) {
      score += priceChange > 0 ? 10 : priceChange < 0 ? -10 : 3;
    } else if (volRatio < 0.5) {
      // Very low volume: less conviction, slight bearish
      score -= 5;
    }
  }

  // Volume trend direction (up to ±10 points)
  if (prevAvg > 0) {
    const trendRatio = recentAvg / prevAvg;
    const priceUp = closes[closes.length - 1] > closes[closes.length - 6];
    if (trendRatio > 1.3 && priceUp) {
      score += 10; // Increasing volume with rising prices
    } else if (trendRatio > 1.3 && !priceUp) {
      score -= 10; // Increasing volume with falling prices
    } else if (trendRatio < 0.7) {
      score -= 3; // Declining volume
    }
  }

  // OBV direction (up to ±10 points)
  if (obvDirection > 0) {
    score += Math.min(10, obvDirection / (avgVol || 1) * 2);
  } else if (obvDirection < 0) {
    score += Math.max(-10, obvDirection / (avgVol || 1) * 2);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const volVsAvg = !isNaN(avgVol) && avgVol > 0
    ? `${((currentVol / avgVol) * 100).toFixed(0)}% of 20-period avg`
    : "N/A";
  const detail = `Vol ${volVsAvg}. ` +
    `Vol trend: ${recentAvg > prevAvg ? "increasing" : "decreasing"}. ` +
    `OBV direction: ${obvDirection > 0 ? "accumulation" : obvDirection < 0 ? "distribution" : "flat"}.`;

  return { name: "VOLUME", score, weight: 0.15, detail, bullish: score > 50 };
}

function scoreStructure(
  closes: number[],
  highs: number[],
  lows: number[],
): ConfluenceFactor {
  const price = closes[closes.length - 1];
  const { supports, resistances } = findSupportResistance(highs, lows, closes, 5);

  // Find nearest support and resistance
  const nearestSupport = supports
    .filter((s) => s < price)
    .sort((a, b) => b - a)[0] ?? Math.min(...closes.slice(-60));
  const nearestResistance = resistances
    .filter((r) => r > price)
    .sort((a, b) => a - b)[0] ?? Math.max(...closes.slice(-60));

  // Distance to support/resistance as percentage of range
  const range = nearestResistance - nearestSupport;
  const distToSupport = range > 0 ? ((price - nearestSupport) / range) * 100 : 50;
  const distToResistance = range > 0 ? ((nearestResistance - price) / range) * 100 : 50;

  // Fibonacci retracement levels using recent swing high/low
  const lookback = Math.min(60, closes.length);
  const recentHigh = Math.max(...highs.slice(-lookback));
  const recentLow = Math.min(...lows.slice(-lookback));
  const fibRange = recentHigh - recentLow;

  // Current price position within Fibonacci levels
  const fibPosition = fibRange > 0 ? (price - recentLow) / fibRange : 0.5;

  // Fibonacci levels:
  // 0.236, 0.382, 0.500, 0.618, 0.786
  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
  let nearestFibDist = Infinity;
  let nearestFibLevel = 0.5;
  for (const fib of fibLevels) {
    const dist = Math.abs(fibPosition - fib);
    if (dist < nearestFibDist) {
      nearestFibDist = dist;
      nearestFibLevel = fib;
    }
  }

  let score = 50; // neutral base

  // Support/Resistance proximity (up to ±20 points)
  // Close to support = bullish (bounce potential)
  // Close to resistance = bearish (rejection potential)
  if (distToSupport < 15) {
    score += 20; // Very close to strong support
  } else if (distToSupport < 30) {
    score += 12;
  } else if (distToResistance < 15) {
    score -= 20; // Very close to strong resistance
  } else if (distToResistance < 30) {
    score -= 12;
  }

  // Fibonacci position scoring (up to ±15 points)
  // At 0.382 support = bullish (potential bounce)
  // At 0.618 resistance = bearish (potential rejection)
  if (fibPosition < 0.382) {
    score += 15; // Near 0.382 support (buy zone)
  } else if (fibPosition < 0.5) {
    score += 8;
  } else if (fibPosition > 0.786) {
    score -= 15; // Near 0.786 resistance (sell zone)
  } else if (fibPosition > 0.618) {
    score -= 8;
  }

  // Recent high/low proximity (up to ±10 points)
  // If price near 52-bar high, bullish momentum
  // If price near 52-bar low, bearish pressure
  const fromHigh = recentHigh > 0 ? ((recentHigh - price) / price) * 100 : 0;
  const fromLow = recentLow > 0 ? ((price - recentLow) / price) * 100 : 0;

  if (fromHigh < 1) {
    score += 10; // Near recent highs
  } else if (fromLow < 1) {
    score -= 10; // Near recent lows
  } else if (fromHigh < 3) {
    score += 5;
  } else if (fromLow < 3) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const detail = `Nearest support at ${nearestSupport.toFixed(2)} (${distToSupport.toFixed(1)}% away). ` +
    `Nearest resistance at ${nearestResistance.toFixed(2)} (${distToResistance.toFixed(1)}% away). ` +
    `Fib position: ${(fibPosition * 100).toFixed(1)}% (nearest level: ${(nearestFibLevel * 100).toFixed(1)}%).`;

  return { name: "STRUCTURE", score, weight: 0.15, detail, bullish: score > 50 };
}

// ═══════════════════════════════════════════════════════════════
// LAYER 2 (continued): CONFLUENCE CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateConfluence(factors: ConfluenceFactor[]): ConfluenceResult {
  let score = 0;
  for (const f of factors) {
    score += f.score * f.weight;
  }

  const bullishCount = factors.filter((f) => f.score > 60).length;
  const bearishCount = factors.filter((f) => f.score < 40).length;

  return {
    score: Math.round(score),
    factors,
    bullishCount,
    bearishCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// LAYER 3: SIGNAL CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

function classifySignal(confluence: ConfluenceResult, regime: MarketRegime): SignalActionV2 {
  const { score, bullishCount, bearishCount } = confluence;

  // STRONG_BUY: confluence > 75 AND 3+ factors bullish (score > 60)
  if (score > 75 && bullishCount >= 3) return "STRONG_LONG";

  // BUY: confluence > 60 AND 2+ factors bullish
  if (score > 60 && bullishCount >= 2) return "LONG";

  // STRONG_SELL: confluence < 25 AND 3+ factors bearish (score < 40)
  if (score < 25 && bearishCount >= 3) return "STRONG_SHORT";

  // SELL: confluence < 40 AND 2+ factors bearish (score < 40)
  if (score < 40 && bearishCount >= 2) return "SHORT";

  // WEAK_BUY: confluence > 55 but conflicting factors
  if (score > 55) return "WEAK_LONG";

  // WEAK_SELL: confluence < 45 but conflicting factors
  if (score < 45) return "WEAK_SHORT";

  // HOLD: confluence 40-55 OR regime = RANGING
  return "HOLD";
}

// ═══════════════════════════════════════════════════════════════
// LAYER 4: VOLATILITY-ADJUSTED TP/SL
// ═══════════════════════════════════════════════════════════════

interface TPSLResult {
  orderType: string;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  riskReward: string;
  positionSize: string;
}

function calculateTPSL(
  price: number,
  atrVal: number,
  action: SignalActionV2,
  regime: MarketRegime,
): TPSLResult {
  const isHold = action === "HOLD";
  const atrPct = price > 0 ? (atrVal / price) * 100 : 2;

  // ATR multipliers per regime
  // TRENDING: wider TP, tighter SL (let winners run)
  // VOLATILE: wider both (more room)
  // RANGING: tighter both (mean reversion)
  // BREAKOUT: wide TP, moderate SL
  const multipliers: Record<MarketRegime, { tpLong: number; slLong: number; tpShort: number; slShort: number }> = {
    TRENDING_UP:   { tpLong: 3.0, slLong: 1.2, tpShort: 2.0, slShort: 1.0 },
    TRENDING_DOWN: { tpLong: 2.0, slLong: 1.0, tpShort: 3.0, slShort: 1.2 },
    RANGING:       { tpLong: 1.5, slLong: 0.8, tpShort: 1.5, slShort: 0.8 },
    VOLATILE:      { tpLong: 2.5, slLong: 1.5, tpShort: 2.5, slShort: 1.5 },
    BREAKOUT:      { tpLong: 3.5, slLong: 1.3, tpShort: 3.0, slShort: 1.3 },
  };

  const m = multipliers[regime];
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

// ═══════════════════════════════════════════════════════════════
// LAYER 5: FILTERING
// ═══════════════════════════════════════════════════════════════

function passesFilter(confluence: ConfluenceResult, action: SignalActionV2): boolean {
  // Min 2 factors > 60 to generate any signal other than HOLD
  if (action !== "HOLD" && confluence.bullishCount < 2 && confluence.bearishCount < 2) {
    return false;
  }

  // For BUY signals: require at least 2 factors with score > 60
  const isBuy = action === "STRONG_LONG" || action === "LONG" || action === "WEAK_LONG";
  if (isBuy && confluence.bullishCount < 2) return false;

  // For SELL signals: require at least 2 factors with score < 40
  const isSell = action === "STRONG_SHORT" || action === "SHORT" || action === "WEAK_SHORT";
  if (isSell && confluence.bearishCount < 2) return false;

  return true;
}

// ═══════════════════════════════════════════════════════════════
// BACKWARD-COMPATIBLE DIMENSION SCORING
// ═══════════════════════════════════════════════════════════════

function scoreSentimentCompat(news: NewsItem[]): { score: number; detail: string } {
  if (!news.length) return { score: 50, detail: "No news data" };
  const bullish = news.filter((n) => {
    const t = (n.title + n.content).toLowerCase();
    return (
      t.includes("surge") || t.includes("rally") || t.includes("bull") || t.includes("breakout") ||
      t.includes("inflow") || t.includes("accumul") || t.includes("upgrade")
    );
  }).length;
  const bearish = news.filter((n) => {
    const t = (n.title + n.content).toLowerCase();
    return (
      t.includes("crash") || t.includes("dump") || t.includes("bear") || t.includes("outflow") ||
      t.includes("decline") || t.includes("downgrade") || t.includes("sell-off")
    );
  }).length;
  const ratio = bullish / (bearish + bullish || 1);
  const score = Math.min(100, Math.round(30 + ratio * 50 + Math.min(20, news.length * 2)));
  return {
    score,
    detail: `${news.length} articles. ${bullish} bullish / ${bearish} bearish signals.`,
  };
}

function scoreETFCompat(summary: ETFSummaryItem[]): { score: number; detail: string } {
  if (!summary.length) return { score: 50, detail: "No ETF data" };
  const latest = summary[0];
  const score = Math.min(100, Math.max(0,
    50 + (latest.total_net_inflow > 0 ? 30 : -20) +
    Math.min(20, Math.log10(Math.abs(latest.total_net_inflow) + 1) * 5)
  ));
  const dir = latest.total_net_inflow > 0 ? "inflow" : "outflow";
  return {
    score: Math.round(score),
    detail: `ETF ${dir} $${(Math.abs(latest.total_net_inflow) / 1e6).toFixed(0)}M.`,
  };
}

function scoreMacroCompat(events: MacroEvent[]): { score: number; detail: string } {
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.date === today);
  const count = todayEvents.flatMap((e) => e.events).length;
  const score = Math.round(50 + (count > 5 ? 20 : count > 2 ? 10 : 0));
  return {
    score,
    detail: count > 0
      ? `${count} macro events today.`
      : "No major macro events today.",
  };
}

function scoreTreasuryCompat(
  companies: { ticker: string; name: string }[],
  purchaseHistory?: BTCPurchaseHistory[],
): { score: number; detail: string } {
  if (!companies.length) return { score: 50, detail: "No BTC treasury data" };
  let baseScore = Math.min(100, 50 + companies.length * 3);
  if (purchaseHistory && purchaseHistory.length > 0) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = purchaseHistory.filter(
      (p) => new Date(p.date).getTime() > thirtyDaysAgo && p.btc_acq > 0,
    );
    if (recent.length > 0) {
      baseScore = Math.min(100, baseScore + Math.min(20, recent.length * 4));
    }
  }
  return {
    score: baseScore,
    detail: `${companies.length} companies hold BTC.`,
  };
}

function buildDimensions(
  closes: number[],
  snapshot: MarketSnapshot | undefined,
  news: NewsItem[],
  etfSummary: ETFSummaryItem[] | undefined,
  macroEvents: MacroEvent[] | undefined,
  btcTreasuries: { ticker: string; name: string }[] | undefined,
  purchaseHistory: BTCPurchaseHistory[] | undefined,
  momentumScore: number,
): { dimensions: SignalDimensions; details: SignalDimensionDetails } {
  const rsiVals = rsi(closes, 14);
  const rsiVal = last(rsiVals);
  const rsiLabel = !isNaN(rsiVal)
    ? (rsiVal < 30 ? "oversold" : rsiVal > 70 ? "overbought" : "neutral")
    : "N/A";

  const sentiment = scoreSentimentCompat(news);
  const etf = etfSummary ? scoreETFCompat(etfSummary) : { score: 50, detail: "No ETF data" };
  const macro = macroEvents ? scoreMacroCompat(macroEvents) : { score: 50, detail: "No macro data" };
  const treasury = btcTreasuries
    ? scoreTreasuryCompat(btcTreasuries, purchaseHistory)
    : { score: 50, detail: "No treasury data" };

  let momentumDetail = `RSI ${!isNaN(rsiVal) ? rsiVal.toFixed(0) : "N/A"} (${rsiLabel}).`;
  if (snapshot) {
    momentumDetail += ` Price $${snapshot.price.toLocaleString()} (${snapshot.change_pct_24h > 0 ? "+" : ""}${snapshot.change_pct_24h.toFixed(1)}% 24h).`;
  }

  return {
    dimensions: {
      etfFlow: etf.score,
      sentiment: sentiment.score,
      macro: macro.score,
      momentum: Math.max(0, Math.min(100, momentumScore)),
      treasury: treasury.score,
    },
    details: {
      etfFlow: etf,
      sentiment,
      macro,
      momentum: { score: momentumScore, detail: momentumDetail },
      treasury,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateSignalV2(input: {
  pair: string;
  klines: SoDEXKline[];
  snapshot?: MarketSnapshot;
  news?: NewsItem[];
  etfSummary?: ETFSummaryItem[];
  macroEvents?: MacroEvent[];
  btcTreasuries?: { ticker: string; name: string }[];
  purchaseHistory?: BTCPurchaseHistory[];
}): SignalV2 | null {
  const { pair, klines, snapshot } = input;
  const news = input.news ?? [];
  const base = pair.split("/")[0];

  // Need minimum bars for indicators
  if (klines.length < 60) return null;

  // ── Normalize ──────────────────────────────────────────
  const nk = normalizeKlines(klines);
  const closes = nk.map((k) => k.close);
  const highs = nk.map((k) => k.high);
  const lows = nk.map((k) => k.low);
  const volumes = nk.map((k) => k.volume);

  const price = closes[closes.length - 1];
  const change24h = closes.length >= 24
    ? ((price - closes[closes.length - 24]) / closes[closes.length - 24]) * 100
    : closes.length >= 2
      ? ((price - closes[closes.length - 2]) / closes[closes.length - 2]) * 100
      : 0;

  // ── Compute all indicators ─────────────────────────────
  const ema20 = last(ema(closes, 20));
  const ema50 = last(ema(closes, 50));
  const ema200 = closes.length >= 200 ? last(ema(closes, 200)) : ema50; // fallback if <200 bars
  const adxResult = adx(highs, lows, closes, 14);
  const adxVal = last(adxResult.adx);

  const bb = bollingerBands(closes, 20, 2);
  const bbWidth = last(bb.width);

  const atrArr = atr(highs, lows, closes, 14);
  const atrVal = last(atrArr);

  // ATR average over recent bars
  const validAtr = atrArr.filter((v) => !isNaN(v));
  const atrAvg = validAtr.length > 0
    ? validAtr.slice(-50).reduce((s, v) => s + v, 0) / Math.min(50, validAtr.length)
    : atrVal;

  // ── LAYER 1: Regime Detection ──────────────────────────
  const regime = detectRegime(
    closes, highs, lows,
    isNaN(adxVal) ? 20 : adxVal,
    isNaN(bbWidth) ? 4 : bbWidth,
    isNaN(atrVal) ? 0 : atrVal,
    isNaN(atrAvg) ? atrVal : atrAvg,
    isNaN(ema20) ? price : ema20,
    isNaN(ema50) ? price : ema50,
    isNaN(ema200) ? price : ema200,
  );

  // ── LAYER 2: Score all 5 factors ───────────────────────
  const trendFactor = scoreTrend(closes, adxResult);
  const momentumFactor = scoreMomentum(closes);
  const volatilityFactor = scoreVolatility(closes, highs, lows);
  const volumeFactor = scoreVolume(closes, volumes);
  const structureFactor = scoreStructure(closes, highs, lows);

  const factors: ConfluenceFactor[] = [
    trendFactor,
    momentumFactor,
    volatilityFactor,
    volumeFactor,
    structureFactor,
  ];

  // ── LAYER 2 (cont.): Confluence calculation ────────────
  const confluence = calculateConfluence(factors);

  // ── LAYER 3: Signal Classification ─────────────────────
  let action = classifySignal(confluence, regime);

  // ── LAYER 5: Filtering ─────────────────────────────────
  if (!passesFilter(confluence, action)) {
    action = "HOLD";
  }

  // Confidence = distance from 50 (neutral), scaled
  const distance = Math.abs(confluence.score - 50);
  const confidence = Math.min(98, Math.max(20, Math.round(50 + distance * 0.96)));

  // ── LAYER 4: TP/SL ─────────────────────────────────────
  const execution = calculateTPSL(price, isNaN(atrVal) ? price * 0.02 : atrVal, action, regime);

  // ── Backward-compatible dimensions ─────────────────────
  const { dimensions, details: dimensionDetails } = buildDimensions(
    closes, snapshot, news, input.etfSummary, input.macroEvents,
    input.btcTreasuries, input.purchaseHistory, momentumFactor.score,
  );

  // ── Build reasoning string ─────────────────────────────
  const actionLabel = action.replace("_", " ");
  const bullishFactors = factors.filter((f) => f.score > 60).map((f) => f.name);
  const bearishFactors = factors.filter((f) => f.score < 40).map((f) => f.name);

  const regimeLabel: Record<MarketRegime, string> = {
    TRENDING_UP: "uptrend",
    TRENDING_DOWN: "downtrend",
    RANGING: "ranging/consolidation",
    VOLATILE: "high volatility",
    BREAKOUT: "breakout",
  };

  let reasoning = `[${actionLabel}] on ${pair} — Confluence ${confluence.score}/100, ` +
    `Regime: ${regimeLabel[regime]}. `;

  if (bullishFactors.length > 0) {
    reasoning += `Bullish factors: ${bullishFactors.join(", ")}. `;
  }
  if (bearishFactors.length > 0) {
    reasoning += `Bearish factors: ${bearishFactors.join(", ")}. `;
  }

  reasoning += factors.map((f) => `${f.name}: ${f.detail}`).join(" | ");

  // ── Sources ────────────────────────────────────────────
  const sources = [
    "SoDEX Klines",
    "Multi-Factor Confluence Engine V2",
    ...(news.length > 0 ? ["SoSoValue News"] : []),
    ...(input.etfSummary?.length ? ["SoSoValue ETF"] : []),
    ...(input.macroEvents?.length ? ["SoSoValue Macro"] : []),
    ...(input.btcTreasuries?.length ? ["SoSoValue BTC Treasuries"] : []),
  ];

  // ── Assemble result ────────────────────────────────────
  return {
    id: `v2-${base.toLowerCase()}-${Date.now()}`,
    pair,
    action,
    confidence,
    price,
    change24h: parseFloat(change24h.toFixed(2)),
    reasoning,
    regime,
    factors,
    confluence: confluence.score,
    dimensions,
    dimensionDetails,
    execution,
    sources,
    timeAgo: "just now",
  };
}

// ═══════════════════════════════════════════════════════════════
// BATCH SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateSignalsV2(input: {
  pairs: string[];
  klinesMap: Map<string, SoDEXKline[]>;
  news?: NewsItem[];
  etfSummary?: ETFSummaryItem[];
  macroEvents?: MacroEvent[];
  btcTreasuries?: { ticker: string; name: string }[];
  purchaseHistory?: BTCPurchaseHistory[];
  snapshots?: Map<string, MarketSnapshot>;
}): SignalV2[] {
  const signals: SignalV2[] = [];

  for (const pair of input.pairs) {
    const base = pair.split("/")[0];
    const klines = input.klinesMap.get(base);
    if (!klines || klines.length < 60) continue;

    const signal = generateSignalV2({
      pair,
      klines,
      news: input.news,
      etfSummary: input.etfSummary,
      macroEvents: input.macroEvents,
      btcTreasuries: input.btcTreasuries,
      purchaseHistory: input.purchaseHistory,
      snapshot: input.snapshots?.get(base),
    });

    if (signal) signals.push(signal);
  }

  return signals;
}
