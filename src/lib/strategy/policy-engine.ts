import type { OrderBook, SoDEXKline } from "../sodex-types";
import type {
  LiveSignalDimensions,
  Signal,
  SignalAction,
  SignalDimensionDetails,
  SignalDimensions,
} from "../types/signal";
import type { StrategyConfig } from "./config";
import { ema, last, rsi } from "./indicators";

const DIMENSION_KEYS: Array<keyof SignalDimensions> = [
  "etfFlow",
  "sentiment",
  "macro",
  "momentum",
  "treasury",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function numberValue(value: string | number | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDirectional(action: SignalAction): action is "LONG" | "SHORT" {
  return action === "LONG" || action === "SHORT";
}

function configuredDimensionScore(signal: Signal, config: StrategyConfig): number {
  const totalWeight = DIMENSION_KEYS.reduce((sum, key) => sum + config[key], 0);
  if (totalWeight <= 0) return 50;

  return DIMENSION_KEYS.reduce((sum, key) => {
    const score = signal.dimensionDetails?.[key]?.score ?? signal.dimensions[key] ?? 50;
    return sum + score * config[key];
  }, 0) / totalWeight;
}

export function applyConfluenceStrategyPolicy(
  signals: Signal[],
  config: StrategyConfig,
): Signal[] {
  return signals.map((signal) => {
    const bullishPolicyScore = configuredDimensionScore(signal, config);
    const directionalSupport = signal.action === "SHORT"
      ? 100 - bullishPolicyScore
      : bullishPolicyScore;
    // Blend external policy dims, but if they are near-neutral (~50) don't drag down a strong TA signal.
    const externalBias = Math.abs(directionalSupport - 50) <= 8 ? 0.08 : 0.22;
    const policyConfidence = isDirectional(signal.action)
      ? Math.round(signal.confidence * (1 - externalBias) + directionalSupport * externalBias)
      : signal.confidence;
    const blockedByThreshold = isDirectional(signal.action)
      && policyConfidence < config.minConfidence;
    const action: SignalAction = blockedByThreshold ? "HOLD" : signal.action;
    const confidence = blockedByThreshold ? Math.min(55, policyConfidence) : policyConfidence;
    const blockedReason = `Strategy Config requires ${config.minConfidence}% minimum confidence.`;

    return {
      ...signal,
      action,
      actionV2: blockedByThreshold ? "HOLD" : signal.actionV2,
      confidence,
      reasoning: blockedByThreshold
        ? `[Confluence V2 policy blocked] ${blockedReason} ${signal.reasoning}`
        : `[Confluence V2 policy active] ${signal.reasoning}`,
      execution: {
        ...signal.execution,
        orderType: "LIMIT",
        positionSize: `${config.maxPositionSize}% max`,
      },
      quality: signal.quality
        ? {
            ...signal.quality,
            calibratedConfidence: confidence,
            minConfidence: config.minConfidence,
            status: blockedByThreshold ? "blocked" : signal.quality.status,
            blockedReasons: blockedByThreshold
              ? [...signal.quality.blockedReasons, blockedReason]
              : signal.quality.blockedReasons,
          }
        : undefined,
      sources: [...new Set([...signal.sources, "Strategy Config"])],
    };
  });
}

interface BookMetrics {
  available: boolean;
  midPrice: number;
  spreadBps: number;
  imbalance: number;
}

function analyzeOrderbook(book: OrderBook | undefined): BookMetrics {
  const bids = book?.bids.slice(0, 5) ?? [];
  const asks = book?.asks.slice(0, 5) ?? [];
  const bestBid = numberValue(bids[0]?.[0]);
  const bestAsk = numberValue(asks[0]?.[0]);
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
  const bidDepth = bids.reduce((sum, [, qty]) => sum + numberValue(qty), 0);
  const askDepth = asks.reduce((sum, [, qty]) => sum + numberValue(qty), 0);
  const totalDepth = bidDepth + askDepth;

  return {
    available: midPrice > 0 && totalDepth > 0,
    midPrice,
    spreadBps: midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 10_000 : Number.POSITIVE_INFINITY,
    imbalance: totalDepth > 0 ? bidDepth / totalDepth : 0.5,
  };
}

function excludedDetail(label: string) {
  return { score: 50, detail: `${label} excluded by Liquidity Flow policy` };
}

function buildLiquidityDimensions(
  momentumScore: number,
  detail: string,
): { dimensions: SignalDimensions; dimensionDetails: SignalDimensionDetails } {
  return {
    dimensions: {
      etfFlow: 50,
      sentiment: 50,
      macro: 50,
      momentum: momentumScore,
      treasury: 50,
    },
    dimensionDetails: {
      etfFlow: excludedDetail("ETF flow"),
      sentiment: excludedDetail("News sentiment"),
      macro: excludedDetail("Macro"),
      momentum: { score: momentumScore, detail },
      treasury: excludedDetail("Treasury"),
    },
  };
}

export function generateLiquidityFlowSignals(input: {
  pairs: string[];
  klinesMap: Map<string, SoDEXKline[]>;
  orderbooks: Map<string, OrderBook>;
  config: StrategyConfig;
}): Signal[] {
  const { pairs, klinesMap, orderbooks, config } = input;

  return pairs.flatMap((pair) => {
    const base = pair.split("/")[0];
    const klines = klinesMap.get(base) ?? [];
    if (klines.length < 30) return [];

    const closes = klines.map((kline) => numberValue(kline.c)).filter((value) => value > 0);
    if (closes.length < 30) return [];

    const book = analyzeOrderbook(orderbooks.get(base));
    const ema9 = last(ema(closes, 9));
    const ema21 = last(ema(closes, 21));
    const rsi14 = last(rsi(closes, 14));
    const price = book.midPrice || closes[closes.length - 1];
    const change24h = closes.length >= 24
      ? ((price - closes[closes.length - 24]) / closes[closes.length - 24]) * 100
      : 0;
    const spreadScore = book.available ? clamp(100 - (book.spreadBps / 3) * 100, 0, 100) : 0;
    const imbalanceStrength = clamp(Math.abs(book.imbalance - 0.5) * 200, 0, 100);
    const trendStrength = ema21 > 0 ? clamp(Math.abs((ema9 - ema21) / ema21) * 10_000, 0, 100) : 0;
    const rsiAlignment = clamp(100 - Math.abs(rsi14 - 50) * 2, 0, 100);
    const rawConfidence = Math.round(clamp(
      55 + imbalanceStrength * 0.2 + spreadScore * 0.1 + trendStrength * 0.1 + rsiAlignment * 0.1,
      20,
      98,
    ));

    const spreadPass = book.available && book.spreadBps <= 3;
    const longPass = spreadPass && book.imbalance >= 0.55 && ema9 > ema21 && rsi14 >= 50 && rsi14 <= 72;
    const shortPass = spreadPass && book.imbalance <= 0.45 && ema9 < ema21 && rsi14 <= 50 && rsi14 >= 28;
    const directionalAction: SignalAction = longPass ? "LONG" : shortPass ? "SHORT" : "HOLD";
    const action = directionalAction !== "HOLD" && rawConfidence >= config.minConfidence
      ? directionalAction
      : "HOLD";
    const confidence = action === "HOLD" ? Math.min(69, rawConfidence) : rawConfidence;
    const momentumDetail = `Spread ${book.available ? book.spreadBps.toFixed(2) : "N/A"} bps, imbalance ${(book.imbalance * 100).toFixed(1)}%, EMA9 ${ema9.toFixed(2)}, EMA21 ${ema21.toFixed(2)}, RSI14 ${rsi14.toFixed(1)}`;
    const { dimensions, dimensionDetails } = buildLiquidityDimensions(confidence, momentumDetail);
    const direction = action === "LONG" ? 1 : action === "SHORT" ? -1 : 0;
    const stopDistance = price * 0.004;
    const targetDistance = price * 0.008;
    const gateReason = !book.available
      ? "orderbook unavailable"
      : !spreadPass
        ? `spread ${book.spreadBps.toFixed(2)} bps exceeds 3 bps`
        : directionalAction === "HOLD"
          ? "imbalance, EMA, and RSI are not aligned"
          : rawConfidence < config.minConfidence
            ? `confidence ${rawConfidence}% is below ${config.minConfidence}% policy`
            : "all liquidity and TA gates passed";

    return [{
      id: `liquidity-${base}-${Date.now()}`,
      pair,
      action,
      actionV2: action,
      confidence,
      price,
      change24h,
      reasoning: `[Liquidity Flow] ${gateReason}. ${momentumDetail}. News and AI are excluded from entry logic.`,
      regime: action === "LONG" ? "TRENDING_UP" : action === "SHORT" ? "TRENDING_DOWN" : "RANGING",
      factors: [
        { name: "TREND", score: ema9 >= ema21 ? 75 : 25, weight: 0.3, detail: `EMA9 ${ema9 >= ema21 ? "above" : "below"} EMA21`, bullish: ema9 >= ema21 },
        { name: "MOMENTUM", score: rsi14, weight: 0.2, detail: `RSI14 ${rsi14.toFixed(1)}`, bullish: rsi14 >= 50 },
        { name: "VOLUME", score: book.imbalance * 100, weight: 0.3, detail: `Top-5 bid share ${(book.imbalance * 100).toFixed(1)}%`, bullish: book.imbalance >= 0.5 },
        { name: "STRUCTURE", score: spreadScore, weight: 0.2, detail: `Spread ${book.available ? book.spreadBps.toFixed(2) : "N/A"} bps`, bullish: spreadPass },
      ],
      confluence: confidence,
      setup: {
        type: action === "HOLD" ? "no_edge" : "trend_continuation",
        direction: action === "LONG" ? "long" : action === "SHORT" ? "short" : "neutral",
        label: action === "HOLD" ? "Liquidity gate blocked" : "Liquidity continuation",
        thesis: gateReason,
        invalidation: "Spread widens above 3 bps or top-book imbalance reverses.",
        evidence: [momentumDetail],
        confidenceBias: confidence - 50,
      },
      dimensions,
      dimensionDetails,
      execution: {
        orderType: "LIMIT ONLY / 200ms",
        entry: price,
        takeProfit: direction === 0 ? price : price + targetDistance * direction,
        stopLoss: direction === 0 ? price : price - stopDistance * direction,
        positionSize: `${config.maxPositionSize}% max`,
        riskReward: action === "HOLD" ? "Stand aside" : "2:1",
      },
      sources: ["SoDEX Orderbook", "SoDEX Klines", "Strategy Config"],
      timeAgo: "Live",
    }];
  });
}

export function liquidityDimensionsFromSignals(signals: Signal[]): Record<string, LiveSignalDimensions> {
  return Object.fromEntries(signals.flatMap((signal) => (
    signal.dimensionDetails
      ? [[
          signal.pair.split("/")[0],
          signal.dimensionDetails as LiveSignalDimensions,
        ]]
      : []
  )));
}
