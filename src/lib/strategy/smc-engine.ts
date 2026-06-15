import type { SoDEXKline } from "../sodex-types";

export interface OrderBlock {
  type: "bullish" | "bearish";
  high: number;
  low: number;
  midpoint: number;
  strength: number;
  tested: boolean;
  barIndex: number;
}

export interface FairValueGap {
  type: "bullish" | "bearish";
  high: number;
  low: number;
  midpoint: number;
  filled: boolean;
  fillPercentage: number;
  barIndex: number;
}

export interface BreakOfStructure {
  type: "bullish" | "bearish";
  level: number;
  confirmed: boolean;
  barIndex: number;
}

export interface LiquiditySweep {
  type: "buy_side" | "sell_side";
  level: number;
  swept: boolean;
  reversal: boolean;
  barIndex: number;
}

export interface SniperEntry {
  zone: "order_block" | "fvg" | "equilibrium";
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  confluences: string[];
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  breaksOfStructure: BreakOfStructure[];
  liquiditySweeps: LiquiditySweep[];
  sniperEntry: SniperEntry | null;
  smcScore: number;
  smcDirection: "bullish" | "bearish" | "neutral";
  smcDetail: string;
}

function findSwingHighs(lows: number[], highs: number[], lookback: number): number[] {
  const swings: number[] = [];
  for (let i = lookback; i < highs.length - lookback; i++) {
    let isSwing = true;
    for (let j = 1; j <= lookback; j++) {
      if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) swings.push(i);
  }
  return swings;
}

function findSwingLows(lows: number[], highs: number[], lookback: number): number[] {
  const swings: number[] = [];
  for (let i = lookback; i < lows.length - lookback; i++) {
    let isSwing = true;
    for (let j = 1; j <= lookback; j++) {
      if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) {
        isSwing = false;
        break;
      }
    }
    if (isSwing) swings.push(i);
  }
  return swings;
}

function detectOrderBlocks(klines: SoDEXKline[], swingHighs: number[], swingLows: number[]): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const closes = klines.map(k => parseFloat(k.c));
  const highs = klines.map(k => parseFloat(k.h));
  const lows = klines.map(k => parseFloat(k.l));
  const opens = klines.map(k => parseFloat(k.o));

  // Bullish OB: bearish candle before strong bullish move
  for (const swingIdx of swingLows) {
    if (swingIdx < 2 || swingIdx >= klines.length - 1) continue;

    const prevCandle = { open: opens[swingIdx - 1], close: closes[swingIdx - 1], high: highs[swingIdx - 1], low: lows[swingIdx - 1] };
    const swingCandle = { open: opens[swingIdx], close: closes[swingIdx], high: highs[swingIdx], low: lows[swingIdx] };

    // Bearish candle followed by strong bullish candle
    if (prevCandle.close < prevCandle.open && swingCandle.close > swingCandle.open) {
      const bodySize = Math.abs(swingCandle.close - swingCandle.open);
      const range = swingCandle.high - swingCandle.low;
      const strength = bodySize / range;

      if (strength > 0.6) {
        const currentPrice = closes[closes.length - 1];
        const tested = currentPrice > prevCandle.low && currentPrice < prevCandle.high;

        obs.push({
          type: "bullish",
          high: prevCandle.high,
          low: prevCandle.low,
          midpoint: (prevCandle.high + prevCandle.low) / 2,
          strength: Math.round(strength * 100),
          tested,
          barIndex: swingIdx - 1,
        });
      }
    }
  }

  // Bearish OB: bullish candle before strong bearish move
  for (const swingIdx of swingHighs) {
    if (swingIdx < 2 || swingIdx >= klines.length - 1) continue;

    const prevCandle = { open: opens[swingIdx - 1], close: closes[swingIdx - 1], high: highs[swingIdx - 1], low: lows[swingIdx - 1] };
    const swingCandle = { open: opens[swingIdx], close: closes[swingIdx], high: highs[swingIdx], low: lows[swingIdx] };

    if (prevCandle.close > prevCandle.open && swingCandle.close < swingCandle.open) {
      const bodySize = Math.abs(swingCandle.close - swingCandle.open);
      const range = swingCandle.high - swingCandle.low;
      const strength = bodySize / range;

      if (strength > 0.6) {
        const currentPrice = closes[closes.length - 1];
        const tested = currentPrice > prevCandle.low && currentPrice < prevCandle.high;

        obs.push({
          type: "bearish",
          high: prevCandle.high,
          low: prevCandle.low,
          midpoint: (prevCandle.high + prevCandle.low) / 2,
          strength: Math.round(strength * 100),
          tested,
          barIndex: swingIdx - 1,
        });
      }
    }
  }

  return obs.slice(-5);
}

function detectFairValueGaps(klines: SoDEXKline[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  const highs = klines.map(k => parseFloat(k.h));
  const lows = klines.map(k => parseFloat(k.l));
  const closes = klines.map(k => parseFloat(k.c));

  for (let i = 2; i < klines.length; i++) {
    const candle0 = { high: highs[i - 2], low: lows[i - 2] };
    const candle1 = { high: highs[i - 1], low: lows[i - 1] };
    const candle2 = { high: highs[i], low: lows[i] };

    // Bullish FVG: gap between candle0.high and candle2.low
    if (candle2.low > candle0.high) {
      const gapHigh = candle2.low;
      const gapLow = candle0.high;
      const midpoint = (gapHigh + gapLow) / 2;
      const currentPrice = closes[closes.length - 1];
      const gapSize = gapHigh - gapLow;

      // Check fill percentage
      let fillPercentage = 0;
      let filled = false;
      for (let j = i + 1; j < klines.length; j++) {
        if (lows[j] <= midpoint) {
          fillPercentage = 100;
          filled = true;
          break;
        } else if (lows[j] < gapHigh) {
          fillPercentage = Math.round(((gapHigh - lows[j]) / gapSize) * 100);
        }
      }

      fvgs.push({
        type: "bullish",
        high: gapHigh,
        low: gapLow,
        midpoint,
        filled,
        fillPercentage,
        barIndex: i - 1,
      });
    }

    // Bearish FVG: gap between candle2.high and candle0.low
    if (candle2.high < candle0.low) {
      const gapHigh = candle0.low;
      const gapLow = candle2.high;
      const midpoint = (gapHigh + gapLow) / 2;
      const gapSize = gapHigh - gapLow;

      let fillPercentage = 0;
      let filled = false;
      for (let j = i + 1; j < klines.length; j++) {
        if (highs[j] >= midpoint) {
          fillPercentage = 100;
          filled = true;
          break;
        } else if (highs[j] > gapLow) {
          fillPercentage = Math.round(((highs[j] - gapLow) / gapSize) * 100);
        }
      }

      fvgs.push({
        type: "bearish",
        high: gapHigh,
        low: gapLow,
        midpoint,
        filled,
        fillPercentage,
        barIndex: i - 1,
      });
    }
  }

  return fvgs.slice(-5);
}

function detectBreakOfStructure(highs: number[], lows: number[], swingHighs: number[], swingLows: number[]): BreakOfStructure[] {
  const bos: BreakOfStructure[] = [];
  const currentPrice = highs[highs.length - 1];

  // Bullish BOS: price breaks above recent swing high
  for (let i = swingHighs.length - 1; i >= 0; i--) {
    const swingIdx = swingHighs[i];
    const level = highs[swingIdx];
    if (currentPrice > level) {
      bos.push({
        type: "bullish",
        level,
        confirmed: true,
        barIndex: swingIdx,
      });
      break;
    }
  }

  // Bearish BOS: price breaks below recent swing low
  for (let i = swingLows.length - 1; i >= 0; i--) {
    const swingIdx = swingLows[i];
    const level = lows[swingIdx];
    if (currentPrice < level) {
      bos.push({
        type: "bearish",
        level,
        confirmed: true,
        barIndex: swingIdx,
      });
      break;
    }
  }

  return bos;
}

function detectLiquiditySweeps(highs: number[], lows: number[], swingHighs: number[], swingLows: number[]): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  const currentPrice = highs[highs.length - 1];

  // Buy-side sweep: price took out swing highs then reversed
  for (let i = swingHighs.length - 1; i >= Math.max(0, swingHighs.length - 3); i--) {
    const swingIdx = swingHighs[i];
    const level = highs[swingIdx];

    // Check if price went above then came back below
    let swept = false;
    let reversal = false;
    for (let j = swingIdx + 1; j < highs.length; j++) {
      if (highs[j] > level) {
        swept = true;
        if (j < highs.length - 1 && highs[j + 1] < level) {
          reversal = true;
          break;
        }
      }
    }

    if (swept) {
      sweeps.push({
        type: "buy_side",
        level,
        swept,
        reversal,
        barIndex: swingIdx,
      });
    }
  }

  return sweeps.slice(-2);
}

function findSniperEntry(
  klines: SoDEXKline[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[],
  bos: BreakOfStructure[],
): SniperEntry | null {
  const closes = klines.map(k => parseFloat(k.c));
  const currentPrice = closes[closes.length - 1];
  const confluences: string[] = [];
  let direction: "long" | "short" | null = null;
  let entry = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  let zone: "order_block" | "fvg" | "equilibrium" = "equilibrium";

  // Check for bullish sniper entry
  const bullishOB = orderBlocks.find(ob => ob.type === "bullish" && !ob.tested && currentPrice >= ob.low && currentPrice <= ob.high);
  const bullishFVG = fvgs.find(fvg => fvg.type === "bullish" && !fvg.filled && currentPrice >= fvg.low && currentPrice <= fvg.high);
  const bullishBOS = bos.find(b => b.type === "bullish" && b.confirmed);

  if (bullishOB && bullishBOS) {
    direction = "long";
    zone = "order_block";
    entry = bullishOB.midpoint;
    stopLoss = bullishOB.low * 0.998;
    takeProfit = entry + (entry - stopLoss) * 2.5;
    confluences.push("Bullish OB", "BOS confirmed", "Untested zone");
  } else if (bullishFVG && bullishBOS) {
    direction = "long";
    zone = "fvg";
    entry = bullishFVG.midpoint;
    stopLoss = bullishFVG.low * 0.998;
    takeProfit = entry + (entry - stopLoss) * 2.5;
    confluences.push("Bullish FVG", "BOS confirmed", "Gap fill expected");
  }

  // Check for bearish sniper entry
  if (!direction) {
    const bearishOB = orderBlocks.find(ob => ob.type === "bearish" && !ob.tested && currentPrice >= ob.low && currentPrice <= ob.high);
    const bearishFVG = fvgs.find(fvg => fvg.type === "bearish" && !fvg.filled && currentPrice >= fvg.low && currentPrice <= fvg.high);
    const bearishBOS = bos.find(b => b.type === "bearish" && b.confirmed);

    if (bearishOB && bearishBOS) {
      direction = "short";
      zone = "order_block";
      entry = bearishOB.midpoint;
      stopLoss = bearishOB.high * 1.002;
      takeProfit = entry - (stopLoss - entry) * 2.5;
      confluences.push("Bearish OB", "BOS confirmed", "Untested zone");
    } else if (bearishFVG && bearishBOS) {
      direction = "short";
      zone = "fvg";
      entry = bearishFVG.midpoint;
      stopLoss = bearishFVG.high * 1.002;
      takeProfit = entry - (stopLoss - entry) * 2.5;
      confluences.push("Bearish FVG", "BOS confirmed", "Gap fill expected");
    }
  }

  if (!direction) return null;

  const confidence = Math.min(95, 50 + confluences.length * 15);

  return {
    zone,
    direction,
    entry: parseFloat(entry.toFixed(6)),
    stopLoss: parseFloat(stopLoss.toFixed(6)),
    takeProfit: parseFloat(takeProfit.toFixed(6)),
    confidence,
    confluences,
  };
}

export function analyzeSMC(klines: SoDEXKline[]): SMCAnalysis {
  if (klines.length < 20) {
    return {
      orderBlocks: [],
      fairValueGaps: [],
      breaksOfStructure: [],
      liquiditySweeps: [],
      sniperEntry: null,
      smcScore: 50,
      smcDirection: "neutral",
      smcDetail: "Insufficient data for SMC analysis",
    };
  }

  const closes = klines.map(k => parseFloat(k.c));
  const highs = klines.map(k => parseFloat(k.h));
  const lows = klines.map(k => parseFloat(k.l));

  const swingHighs = findSwingHighs(lows, highs, 3);
  const swingLows = findSwingLows(lows, highs, 3);

  const orderBlocks = detectOrderBlocks(klines, swingHighs, swingLows);
  const fairValueGaps = detectFairValueGaps(klines);
  const breaksOfStructure = detectBreakOfStructure(highs, lows, swingHighs, swingLows);
  const liquiditySweeps = detectLiquiditySweeps(highs, lows, swingHighs, swingLows);
  const sniperEntry = findSniperEntry(klines, orderBlocks, fairValueGaps, breaksOfStructure);

  // Calculate SMC score
  let score = 50;
  const bullishFactors = orderBlocks.filter(ob => ob.type === "bullish").length +
    fairValueGaps.filter(fvg => fvg.type === "bullish").length +
    breaksOfStructure.filter(bos => bos.type === "bullish").length;
  const bearishFactors = orderBlocks.filter(ob => ob.type === "bearish").length +
    fairValueGaps.filter(fvg => fvg.type === "bearish").length +
    breaksOfStructure.filter(bos => bos.type === "bearish").length;

  score += (bullishFactors - bearishFactors) * 8;
  if (sniperEntry) score += sniperEntry.direction === "long" ? 15 : -15;
  score = Math.max(0, Math.min(100, score));

  const direction = score > 60 ? "bullish" : score < 40 ? "bearish" : "neutral";

  const details: string[] = [];
  if (orderBlocks.length > 0) details.push(`${orderBlocks.length} OB`);
  if (fairValueGaps.length > 0) details.push(`${fairValueGaps.length} FVG`);
  if (breaksOfStructure.length > 0) details.push(`${breaksOfStructure.length} BOS`);
  if (sniperEntry) details.push(`Sniper: ${sniperEntry.direction}`);

  return {
    orderBlocks,
    fairValueGaps,
    breaksOfStructure,
    liquiditySweeps,
    sniperEntry,
    smcScore: score,
    smcDirection: direction,
    smcDetail: details.length > 0 ? details.join(", ") : "No SMC patterns detected",
  };
}
