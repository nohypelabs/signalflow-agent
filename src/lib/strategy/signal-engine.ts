import { sma, ema, rsi, macd, bollingerBands, atr, last } from "./indicators";
import type { Signal, SignalAction, SignalDimensions, SignalDimensionDetails, SignalExecution } from "../types/signal";
import type { NewsItem, ETFSummaryItem, MacroEvent, MarketSnapshot, BTCPurchaseHistory } from "../sosovalue";
import type { SoDEXKline } from "../sodex-types";

// ── Dimension scoring (enhanced for route + engine) ──────

export function scoreSentiment(news: NewsItem[]): { score: number; detail: string } {
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
  const score = Math.round(30 + ratio * 50 + Math.min(20, news.length * 2));
  return {
    score: Math.min(100, score),
    detail: `${news.length} hot articles. ${bullish} bullish / ${bearish} bearish signals detected from headlines.`,
  };
}

export function scoreETF(summary: ETFSummaryItem[]): { score: number; detail: string } {
  if (!summary.length) return { score: 50, detail: "No ETF data" };
  const latest = summary[0];
  const score = Math.min(100, Math.max(0, 50 + (latest.total_net_inflow > 0 ? 30 : -20) + Math.min(20, Math.log10(Math.abs(latest.total_net_inflow) + 1) * 5)));
  const dir = latest.total_net_inflow > 0 ? "inflow" : "outflow";
  return {
    score: Math.round(score),
    detail: `ETF ${dir} $${(Math.abs(latest.total_net_inflow) / 1e6).toFixed(0)}M in 24h. Cum: $${(latest.cum_net_inflow / 1e9).toFixed(1)}B. AUM: $${(latest.total_net_assets / 1e9).toFixed(1)}B.`,
  };
}

export function scoreMacro(events: MacroEvent[]): { score: number; detail: string } {
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e) => e.date === today);
  const count = todayEvents.flatMap((e) => e.events).length;
  const score = Math.round(50 + (count > 5 ? 20 : count > 2 ? 10 : 0));
  return {
    score,
    detail: count > 0
      ? `${count} macro events today: ${todayEvents.flatMap((e) => e.events).slice(0, 3).join(", ")}${count > 3 ? "..." : ""}`
      : "No major macro events today. Fed stance remains data-dependent.",
  };
}

export function scoreMomentum(snap: MarketSnapshot): { score: number; detail: string } {
  const chg = snap.change_pct_24h;
  const score = Math.round(50 + Math.max(-40, Math.min(40, chg * 8)));
  return {
    score: Math.min(100, Math.max(0, score)),
    detail: `$${snap.price.toLocaleString()} (${chg > 0 ? "+" : ""}${chg.toFixed(1)}% 24h). Rank #${snap.marketcap_rank}. Vol $${(snap.turnover_24h / 1e9).toFixed(1)}B.`,
  };
}

export function scoreTreasury(
  companies: { ticker: string; name: string }[],
  purchaseHistory?: BTCPurchaseHistory[],
): { score: number; detail: string } {
  if (!companies.length) return { score: 50, detail: "No BTC treasury data" };

  let baseScore = Math.min(100, 50 + companies.length * 3);
  let recentActivity = "";

  if (purchaseHistory && purchaseHistory.length > 0) {
    // Analyze recent purchases (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentPurchases = purchaseHistory.filter(
      (p) => new Date(p.date).getTime() > thirtyDaysAgo && p.btc_acq > 0,
    );

    if (recentPurchases.length > 0) {
      const totalAcquired = recentPurchases.reduce((s, p) => s + p.btc_acq, 0);
      const totalCost = recentPurchases.reduce((s, p) => s + p.acq_cost, 0);
      // Boost score based on recent accumulation
      baseScore = Math.min(100, baseScore + Math.min(20, recentPurchases.length * 4));
      recentActivity = ` Recent: ${recentPurchases.length} purchases (${totalAcquired.toFixed(0)} BTC, $${(totalCost / 1e6).toFixed(0)}M).`;
    }
  }

  return {
    score: baseScore,
    detail: `${companies.length} public companies hold BTC. Top: ${companies.slice(0, 3).map((c) => c.ticker).join(", ")}.${recentActivity}`,
  };
}

// ── Dynamic weight engine ────────────────────────────────

const BASE_WEIGHTS = {
  etfFlow: 20,
  sentiment: 20,
  macro: 20,
  momentum: 20,
  treasury: 20,
};

export interface DimScore {
  score: number;
  detail: string;
}

export interface WeightedDims {
  etfFlow: DimScore;
  sentiment: DimScore;
  macro: DimScore;
  momentum: DimScore;
  treasury: DimScore;
}

export function dynamicWeightScore(dims: WeightedDims): {
  overall: number;
  weights: Record<string, number>;
  capped: string[];
} {
  const scores = [
    { key: "etfFlow", score: dims.etfFlow.score },
    { key: "sentiment", score: dims.sentiment.score },
    { key: "macro", score: dims.macro.score },
    { key: "momentum", score: dims.momentum.score },
    { key: "treasury", score: dims.treasury.score },
  ];

  const mean = scores.reduce((s, d) => s + d.score, 0) / scores.length;
  const variance = scores.reduce((s, d) => s + (d.score - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const capped: string[] = [];
  const weights: Record<string, number> = {};
  let totalWeight = 100;

  for (const d of scores) {
    if (stdDev > 8 && Math.abs(d.score - mean) > 1.5 * stdDev) {
      weights[d.key] = 8;
      capped.push(d.key);
      totalWeight -= 8;
    } else {
      weights[d.key] = BASE_WEIGHTS[d.key as keyof typeof BASE_WEIGHTS];
      totalWeight -= BASE_WEIGHTS[d.key as keyof typeof BASE_WEIGHTS];
    }
  }

  if (capped.length > 0 && totalWeight > 0) {
    const uncapped = scores.filter((d) => !capped.includes(d.key));
    const uncappedTotal = uncapped.reduce((s, d) => s + d.score, 0);
    for (const d of uncapped) {
      if (uncappedTotal > 0) {
        weights[d.key] += Math.round((d.score / uncappedTotal) * totalWeight);
      }
    }
  }

  const overall = Math.round(
    scores.reduce((s, d) => s + d.score * (weights[d.key] / 100), 0),
  );

  return { overall, weights, capped };
}

// ── TA-based scoring ──────────────────────────────────────

interface TAScores {
  momentum: number;
  trend: number;
  volatility: number;
  rsiValue: number;
  macdHistogram: number;
  bbPercentB: number;
  bbWidth: number;
  atrValue: number;
  emaShort: number;
  emaLong: number;
}

// SoDEX klines use short field names (o,h,l,c) — normalize to full names
interface NormalizedKline {
  close: number;
  high: number;
  low: number;
  open: number;
}

function normalizeKlines(klines: SoDEXKline[]): NormalizedKline[] {
  return klines.map((k) => ({
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
  }));
}

function computeTA(klines: NormalizedKline[]): TAScores | null {
  if (klines.length < 50) return null;

  const closes = klines.map((k) => k.close);
  const highs = klines.map((k) => k.high);
  const lows = klines.map((k) => k.low);

  const rsiVals = rsi(closes, 14);
  const rsiValue = last(rsiVals);

  const { histogram } = macd(closes, 12, 26, 9);
  const macdHistogram = last(histogram);

  const bb = bollingerBands(closes, 20, 2);
  const bbPercentB = last(bb.percentB);
  const bbWidth = last(bb.width);

  const emaShort = last(ema(closes, 9));
  const emaLong = last(ema(closes, 21));

  const atrValue = last(atr(highs, lows, closes, 14));

  if (isNaN(rsiValue) || isNaN(macdHistogram) || isNaN(bbPercentB) || isNaN(atrValue)) {
    return null;
  }

  // Momentum: RSI-based, 50 is neutral, oversold <30, overbought >70
  // Low RSI = bullish (buy opportunity), High RSI = bearish
  // Invert so oversold → high score (buy signal)
  let momentum = 50;
  if (rsiValue < 30) momentum = 80 + (30 - rsiValue);
  else if (rsiValue < 40) momentum = 60 + (40 - rsiValue) * 2;
  else if (rsiValue > 70) momentum = 20 - (rsiValue - 70);
  else if (rsiValue > 60) momentum = 40 - (rsiValue - 60) * 2;
  else momentum = 50;
  momentum = Math.max(0, Math.min(100, momentum));

  // Trend: EMA crossover + MACD histogram
  let trend = 50;
  if (!isNaN(emaShort) && !isNaN(emaLong)) {
    if (emaShort > emaLong) trend += 20;
    else trend -= 20;
  }
  if (macdHistogram > 0) trend += 15;
  else trend -= 15;
  trend = Math.max(0, Math.min(100, trend));

  // Volatility: BB percent B tells position within bands
  // <0 = below lower band (oversold → buy), >1 = above upper (overbought → sell)
  let volatility = 50;
  if (bbPercentB < 0) volatility = 75 + Math.min(25, Math.abs(bbPercentB) * 50);
  else if (bbPercentB < 0.2) volatility = 65;
  else if (bbPercentB > 1) volatility = 25 - Math.min(25, (bbPercentB - 1) * 50);
  else if (bbPercentB > 0.8) volatility = 35;
  volatility = Math.max(0, Math.min(100, volatility));

  return {
    momentum,
    trend,
    volatility,
    rsiValue,
    macdHistogram,
    bbPercentB,
    bbWidth: isNaN(bbWidth) ? 0 : bbWidth,
    atrValue,
    emaShort: isNaN(emaShort) ? 0 : emaShort,
    emaLong: isNaN(emaLong) ? 0 : emaLong,
  };
}

// ── Signal decision engine ────────────────────────────────

interface SignalInput {
  pair: string;
  klines: SoDEXKline[];
  news: NewsItem[];
  etfSummary?: ETFSummaryItem[];
  macroEvents?: MacroEvent[];
  btcTreasuries?: { ticker: string; name: string }[];
  purchaseHistory?: BTCPurchaseHistory[];
  snapshot?: MarketSnapshot;
}

export function generateSignal(input: SignalInput): Signal | null {
  const { pair, klines, news } = input;
  const base = pair.split("/")[0];

  if (klines.length < 50) return null;

  const normalized = normalizeKlines(klines);
  const closes = normalized.map((k) => k.close);
  const currentPrice = closes[closes.length - 1];
  const prevPrice = closes.length > 1 ? closes[closes.length - 2] : currentPrice;
  const change24h = closes.length >= 24
    ? ((currentPrice - closes[closes.length - 24]) / closes[closes.length - 24]) * 100
    : ((currentPrice - prevPrice) / prevPrice) * 100;

  // TA scoring
  const ta = computeTA(normalized);
  if (!ta) return null;

  // Sentiment from news
  const sentiment = scoreSentiment(news);

  // ETF, macro, treasury (with fallbacks)
  const etf = input.etfSummary ? scoreETF(input.etfSummary) : { score: 50, detail: "No ETF data" };
  const macro = input.macroEvents ? scoreMacro(input.macroEvents) : { score: 50, detail: "No macro data" };
  const treasury = input.btcTreasuries ? scoreTreasury(input.btcTreasuries, input.purchaseHistory) : { score: 50, detail: "No treasury data" };

  // Combine TA momentum + snapshot momentum
  let momentumScore = ta.momentum;
  if (input.snapshot) {
    const snapMomentum = Math.round(50 + Math.max(-40, Math.min(40, input.snapshot.change_pct_24h * 8)));
    momentumScore = Math.round(momentumScore * 0.6 + snapMomentum * 0.4);
  }

  // ── Action decision ─────────────────────────────────────
  // Weighted scoring: TA carries 55%, sentiment 25%, fundamental 20%
  const taScore = (ta.momentum * 0.35) + (ta.trend * 0.35) + (ta.volatility * 0.30);
  const sentimentWeight = sentiment.score;
  const fundamentalScore = (etf.score * 0.3) + (macro.score * 0.4) + (treasury.score * 0.3);

  const composite = (taScore * 0.55) + (sentimentWeight * 0.25) + (fundamentalScore * 0.20);

  let action: SignalAction = "HOLD";
  if (composite > 60 && ta.momentum > 55 && ta.trend > 50 && sentiment.score > 45) {
    action = "LONG";
  } else if (composite < 40 && ta.momentum < 45 && ta.trend < 50 && sentiment.score < 55) {
    action = "SHORT";
  }

  // Confidence = distance from 50 (neutral), scaled 50-98
  const distance = Math.abs(composite - 50);
  const confidence = Math.round(Math.min(98, 50 + distance * 1.5));

  // ── TP/SL from ATR ──────────────────────────────────────
  const atrPct = currentPrice > 0 ? (ta.atrValue / currentPrice) * 100 : 2;
  let takeProfit: number;
  let stopLoss: number;

  if (action === "LONG") {
    takeProfit = currentPrice * (1 + 2 * atrPct / 100);
    stopLoss = currentPrice * (1 - atrPct / 100);
  } else if (action === "SHORT") {
    takeProfit = currentPrice * (1 - 2 * atrPct / 100);
    stopLoss = currentPrice * (1 + atrPct / 100);
  } else {
    // HOLD — still show potential range
    takeProfit = currentPrice * (1 + 1.5 * atrPct / 100);
    stopLoss = currentPrice * (1 - 0.75 * atrPct / 100);
  }

  // Risk/Reward ratio
  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const rrRatio = risk > 0 ? (reward / risk).toFixed(1) : "—";

  // ── Build reasoning string ──────────────────────────────
  const rsiLabel = ta.rsiValue < 30 ? "oversold" : ta.rsiValue > 70 ? "overbought" : "neutral";
  const macdLabel = ta.macdHistogram > 0 ? "bullish" : "bearish";
  const bbLabel = ta.bbPercentB < 0 ? "below lower band" : ta.bbPercentB > 1 ? "above upper band" : "within bands";
  const trendLabel = ta.emaShort > ta.emaLong ? "uptrend (EMA9 > EMA21)" : "downtrend (EMA9 < EMA21)";

  const reasoning = `${action === "LONG" ? "Bullish" : action === "SHORT" ? "Bearish" : "Neutral"} setup on ${pair}. RSI ${ta.rsiValue.toFixed(0)} (${rsiLabel}), MACD histogram ${macdLabel} (${ta.macdHistogram.toFixed(2)}), price ${bbLabel}. ${trendLabel}. ATR ${atrPct.toFixed(1)}% suggests ${atrPct > 3 ? "high" : atrPct > 1.5 ? "moderate" : "low"} volatility. ${sentiment.detail}`;

  // ── Dimension scores ────────────────────────────────────
  const dimensions: SignalDimensions = {
    etfFlow: etf.score,
    sentiment: sentiment.score,
    macro: macro.score,
    momentum: Math.max(0, Math.min(100, momentumScore)),
    treasury: treasury.score,
  };

  const dimensionDetails: SignalDimensionDetails = {
    etfFlow: etf,
    sentiment,
    macro,
    momentum: { score: momentumScore, detail: `RSI ${ta.rsiValue.toFixed(0)} (${rsiLabel}), MACD ${macdLabel}. ${trendLabel}.` },
    treasury,
  };

  const execution: SignalExecution = {
    orderType: action === "HOLD" ? "Limit" : "Market",
    entry: currentPrice,
    takeProfit: parseFloat(takeProfit.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    positionSize: "2-5%",
    riskReward: `${rrRatio}:1`,
  };

  return {
    id: `ta-${base.toLowerCase()}-${Date.now()}`,
    pair,
    action,
    confidence,
    price: currentPrice,
    change24h: parseFloat(change24h.toFixed(2)),
    reasoning,
    dimensions,
    dimensionDetails,
    execution,
    sources: ["SoDEX Klines", "TA Engine", "SoSoValue News", ...(
      input.etfSummary?.length ? ["SoSoValue ETF"] : []
    ), ...(
      input.macroEvents?.length ? ["SoSoValue Macro"] : []
    )],
    timeAgo: "just now",
  };
}

// ── Batch signal generation for multiple pairs ────────────

export interface BatchSignalInput {
  pairs: string[];
  klinesMap: Map<string, SoDEXKline[]>;
  news: NewsItem[];
  etfSummary?: ETFSummaryItem[];
  macroEvents?: MacroEvent[];
  btcTreasuries?: { ticker: string; name: string }[];
  purchaseHistory?: BTCPurchaseHistory[];
  snapshots?: Map<string, MarketSnapshot>;
}

export function generateSignals(input: BatchSignalInput): Signal[] {
  const signals: Signal[] = [];

  for (const pair of input.pairs) {
    const base = pair.split("/")[0];
    const klines = input.klinesMap.get(base);
    if (!klines || klines.length < 50) continue;

    const signal = generateSignal({
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
