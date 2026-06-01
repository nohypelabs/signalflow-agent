// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import type { SoDEXKline } from "../../sodex-types";

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

export interface NormalizedKline {
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

export function normalizeKlines(klines: SoDEXKline[]): NormalizedKline[] {
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
