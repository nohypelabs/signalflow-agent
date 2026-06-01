// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import { sma, ema, rsi, macd, bollingerBands, atr, last } from "../indicators";
import type { SignalDimensions, SignalDimensionDetails } from "../../types/signal";
import type { NewsItem, ETFSummaryItem, MacroEvent, MarketSnapshot, BTCPurchaseHistory } from "../../sosovalue";
import { obv, roc, findSupportResistance } from "./indicator-engine";
import type { ConfluenceFactor, ConfluenceResult, SignalActionV2 } from "./types";

export function scoreTrend(
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

export function scoreMomentum(closes: number[]): ConfluenceFactor {
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

export function scoreVolatility(
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

export function scoreVolume(
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

export function scoreStructure(
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

export function calculateConfluence(factors: ConfluenceFactor[]): ConfluenceResult {
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

export function classifySignal(confluence: ConfluenceResult): SignalActionV2 {
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

export function passesFilter(confluence: ConfluenceResult, action: SignalActionV2): boolean {
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

export function buildDimensions(
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
