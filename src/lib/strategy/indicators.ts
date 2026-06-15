// Pure technical analysis indicator functions.
// All inputs are arrays of close prices (number[]).

export function sma(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    result.push(sum / period);
  }
  return result;
}

export function ema(closes: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += closes[j];
      prev = sum / period;
    } else {
      prev = closes[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(NaN); continue; }
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);

    if (i < period) { result.push(NaN); continue; }

    if (i === period) {
      let avgGain = 0, avgLoss = 0;
      for (let j = 0; j < period; j++) { avgGain += gains[j]; avgLoss += losses[j]; }
      avgGain /= period; avgLoss /= period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      // Smoothed
      // Recalc from smoothed averages
      let avgGain = 0, avgLoss = 0;
      const startIdx = gains.length - period;
      for (let j = startIdx; j < gains.length; j++) { avgGain += gains[j]; avgLoss += losses[j]; }
      avgGain /= period; avgLoss /= period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }

  // Signal line = EMA of MACD line (only valid values)
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalEma = ema(validMacd, signalPeriod);

  const signal: number[] = [];
  let vi = 0;
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i])) { signal.push(NaN); continue; }
    signal.push(signalEma[vi] ?? NaN);
    vi++;
  }

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signal[i])) { histogram.push(NaN); continue; }
    histogram.push(macdLine[i] - signal[i]);
  }

  return { macd: macdLine, signal, histogram };
}

export interface BBResult {
  upper: number[];
  middle: number[];
  lower: number[];
  width: number[];  // (upper - lower) / middle * 100
  percentB: number[]; // (price - lower) / (upper - lower)
}

export function bollingerBands(closes: number[], period = 20, stdDevMultiplier = 2): BBResult {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];
  const percentB: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(middle[i])) { upper.push(NaN); lower.push(NaN); width.push(NaN); percentB.push(NaN); continue; }

    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += (closes[j] - middle[i]) ** 2;
    }
    const sd = Math.sqrt(sumSqDiff / period);
    const u = middle[i] + stdDevMultiplier * sd;
    const l = middle[i] - stdDevMultiplier * sd;

    upper.push(u);
    lower.push(l);
    width.push(middle[i] !== 0 ? ((u - l) / middle[i]) * 100 : 0);
    percentB.push(u !== l ? (closes[i] - l) / (u - l) : 0.5);
  }

  return { upper, middle, lower, width, percentB };
}

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const result: number[] = [];
  const trValues: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { trValues.push(highs[i] - lows[i]); result.push(NaN); continue; }
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    trValues.push(tr);

    if (i < period - 1) { result.push(NaN); continue; }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += trValues[j];
      result.push(sum / period);
    } else {
      result.push((result[i - 1] * (period - 1) + tr) / period);
    }
  }
  return result;
}

// Helper: get last valid value from an indicator array
export function last(arr: number[]): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) return arr[i];
  }
  return NaN;
}

export interface StochRSIResult {
  k: number[];  // Fast %K (RSI smoothed)
  d: number[];  // Slow %D (SMA of %K)
}

export function stochRSI(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3,
): StochRSIResult {
  const rsiVals = rsi(closes, rsiPeriod);
  const k: number[] = [];
  const d: number[] = [];

  // Calculate %K = (RSI - lowest RSI) / (highest RSI - lowest RSI) * 100
  for (let i = 0; i < rsiVals.length; i++) {
    if (isNaN(rsiVals[i]) || i < stochPeriod - 1) {
      k.push(NaN);
      continue;
    }

    let lowest = Infinity;
    let highest = -Infinity;
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      if (!isNaN(rsiVals[j])) {
        lowest = Math.min(lowest, rsiVals[j]);
        highest = Math.max(highest, rsiVals[j]);
      }
    }

    const range = highest - lowest;
    k.push(range === 0 ? 50 : ((rsiVals[i] - lowest) / range) * 100);
  }

  // Smooth %K with SMA
  const kSmoothed = sma(k.filter(v => !isNaN(v)), kSmooth);
  const dSmoothed = sma(kSmoothed.filter(v => !isNaN(v)), dSmooth);

  // Map back to full array
  const kResult: number[] = [];
  const dResult: number[] = [];
  let ki = 0;
  let di = 0;

  for (let i = 0; i < rsiVals.length; i++) {
    if (isNaN(k[i])) {
      kResult.push(NaN);
      dResult.push(NaN);
    } else {
      kResult.push(kSmoothed[ki] ?? NaN);
      ki++;
      if (ki >= kSmooth) {
        dResult.push(dSmoothed[di] ?? NaN);
        di++;
      } else {
        dResult.push(NaN);
      }
    }
  }

  return { k: kResult, d: dResult };
}
