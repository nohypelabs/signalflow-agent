// Extracted from signal-engine-v2.ts. Keep public behavior stable.
import { ema, bollingerBands, atr, last } from "../indicators";
import { TRADING_TYPES, type TradingType } from "../../types/trading-type";
import type { NewsItem, ETFSummaryItem, MacroEvent, MarketSnapshot, BTCPurchaseHistory } from "../../sosovalue";
import type { SoDEXKline } from "../../sodex-types";
import { adx, normalizeKlines } from "./indicator-engine";
import { detectRegime } from "./regime-engine";
import { scoreTrend, scoreMomentum, scoreVolatility, scoreVolume, scoreStructure, calculateConfluence, classifySignal, passesFilter, buildDimensions } from "./score-engine";
import { calculateTPSL } from "./execution-plan-builder";
import type { ConfluenceFactor, MarketRegime, SignalV2 } from "./types";

export function generateSignalV2(input: {
  pair: string;
  klines: SoDEXKline[];
  snapshot?: MarketSnapshot;
  news?: NewsItem[];
  etfSummary?: ETFSummaryItem[];
  macroEvents?: MacroEvent[];
  btcTreasuries?: { ticker: string; name: string }[];
  purchaseHistory?: BTCPurchaseHistory[];
  tradingType?: TradingType;
}): SignalV2 | null {
  const { pair, klines, snapshot } = input;
  const news = input.news ?? [];
  const base = pair.split("/")[0];
  const tradingType = input.tradingType;

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

  // ── Override weights if tradingType is specified ────────
  if (tradingType) {
    const typeWeights = TRADING_TYPES[tradingType].weights;
    const weightMap: Record<string, number> = {
      TREND: typeWeights.trend / 100,
      MOMENTUM: typeWeights.momentum / 100,
      VOLATILITY: typeWeights.volatility / 100,
      VOLUME: typeWeights.volume / 100,
      STRUCTURE: typeWeights.structure / 100,
    };
    for (const f of factors) {
      if (f.name in weightMap) {
        f.weight = weightMap[f.name];
      }
    }
  }

  // ── LAYER 2 (cont.): Confluence calculation ────────────
  const confluence = calculateConfluence(factors);

  // ── LAYER 3: Signal Classification ─────────────────────
  let action = classifySignal(confluence);

  // ── LAYER 5: Filtering ─────────────────────────────────
  if (!passesFilter(confluence, action)) {
    action = "HOLD";
  }

  // Confidence = distance from 50 (neutral), scaled
  const distance = Math.abs(confluence.score - 50);
  const confidence = Math.min(98, Math.max(20, Math.round(50 + distance * 0.96)));

  // ── LAYER 4: TP/SL ─────────────────────────────────────
  const execution = calculateTPSL(price, isNaN(atrVal) ? price * 0.02 : atrVal, action, regime, tradingType);

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
    tradingType,
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
  tradingType?: TradingType;
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
      tradingType: input.tradingType,
    });

    if (signal) signals.push(signal);
  }

  return signals;
}
