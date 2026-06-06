// SignalFlow Agent — Strategy Policy Engine
// ─────────────────────────────────────────────────────────────
// Two strategies: Confluence V2 (TA-based) and Liquidity Flow
// (order flow / microstructure-based). Liquidity Flow uses
// orderbook depth, trade flow, funding rate, and OI as PRIMARY
// signal source. TA is demoted to confirmation layer only.

import type { OrderBook, SoDEXKline } from "../sodex-types";
import type { SoDEXPerpsTicker } from "../sodex-perps";
import type { SoDEXTrade } from "../types/trade";
import type {
  LiveSignalDimensions,
  Signal,
  SignalAction,
  SignalDimensionDetails,
  SignalDimensions,
} from "../types/signal";
import type { StrategyConfig } from "./config";
import { ema, last, rsi } from "./indicators";
import {
  analyzeTradeFlow,
  analyzeDepth,
  analyzeFunding,
  scoreOrderFlow,
  type OrderFlowScore,
} from "./order-flow-engine";

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

// ── Confluence V2 Policy ─────────────────────────────────────

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
    // v3: Policy is now mostly the user minConfidence knob.
    // Legacy external dims (etf/sentiment/...) have minimal drag — the rich factors[] (TA + micro) are authoritative.
    // This keeps signals flowing for pattern analysis while the final gate stays tunable.
    const policyConfidence = signal.confidence;
    const blockedByThreshold = isDirectional(signal.action) && policyConfidence < config.minConfidence;
    const action: SignalAction = blockedByThreshold ? "HOLD" : signal.action;
    const confidence = blockedByThreshold ? Math.min(55, policyConfidence) : policyConfidence;
    const blockedReason = `Strategy Config requires ${config.minConfidence}% minimum confidence.`;

    return {
      ...signal,
      action,
      actionV2: blockedByThreshold ? "HOLD" : signal.actionV2,
      confidence,
      reasoning: blockedByThreshold
        ? `[policy blocked] ${blockedReason} ${signal.reasoning}`
        : signal.reasoning,
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
      sources: [...new Set([...signal.sources, "Policy"])],
    };
  });
}

// ── Liquidity Flow — Microstructure-Based Signals ────────────

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

export interface LiquidityFlowInput {
  pairs: string[];
  klinesMap: Map<string, SoDEXKline[]>;
  orderbooks: Map<string, OrderBook>;
  config: StrategyConfig;
  // Enhanced data sources (microstructure)
  perpsTickers?: Map<string, SoDEXPerpsTicker>;
  recentTrades?: Map<string, SoDEXTrade[]>;
  hlFundingRates?: Map<string, number>;
}

export function generateLiquidityFlowSignals(input: LiquidityFlowInput): Signal[] {
  const { pairs, klinesMap, orderbooks, config } = input;
  const perpsTickers = input.perpsTickers ?? new Map();
  const recentTrades = input.recentTrades ?? new Map();
  const hlFunding = input.hlFundingRates ?? new Map();

  return pairs.flatMap((pair) => {
    const base = pair.split("/")[0];
    const klines = klinesMap.get(base) ?? [];
    if (klines.length < 30) return [];

    const closes = klines.map((kline) => numberValue(kline.c)).filter((value) => value > 0);
    if (closes.length < 30) return [];

    // ── 1. ORDER FLOW (Primary Signal) ──────────────────
    const trades = recentTrades.get(base) ?? [];
    const tradeFlow = analyzeTradeFlow(trades);
    const depth = analyzeDepth(orderbooks.get(base), 20);
    const funding = analyzeFunding(
      perpsTickers.get(base) ?? null,
      hlFunding.get(base) ?? null,
    );
    const flowScore = scoreOrderFlow({ tradeFlow, depth, funding });

    // ── 2. TA CONFIRMATION (Secondary) ──────────────────
    const ema9 = last(ema(closes, 9));
    const ema21 = last(ema(closes, 21));
    const rsi14 = last(rsi(closes, 14));
    const price = depth.midPrice || flowScore.depth.midPrice || closes[closes.length - 1];
    const change24h = closes.length >= 24
      ? ((price - closes[closes.length - 24]) / closes[closes.length - 24]) * 100
      : 0;

    const taBullish = ema9 > ema21 && rsi14 > 45 && rsi14 < 75;
    const taBearish = ema9 < ema21 && rsi14 < 55 && rsi14 > 25;
    const taAligned = (taBullish && flowScore.direction === "bullish")
      || (taBearish && flowScore.direction === "bearish");
    const taConflicts = (taBullish && flowScore.direction === "bearish")
      || (taBearish && flowScore.direction === "bullish");

    // ── 3. SIGNAL CLASSIFICATION ────────────────────────
    let action: SignalAction = "HOLD";
    let confidence = flowScore.confidence;
    const reasons: string[] = [...flowScore.breakdown];

    if (flowScore.direction === "bullish") {
      if (taAligned) {
        action = "LONG";
        confidence = Math.min(98, confidence + 10);
        reasons.push("✓ TA confirms bullish flow (EMA9>EMA21, RSI aligned)");
      } else if (taConflicts) {
        // Flow says long but TA says short — still actionable but lower confidence
        if (flowScore.score > 60) {
          action = "LONG";
          confidence = Math.max(20, confidence - 12);
          reasons.push("⚠ TA conflicts with flow — proceeding on microstructure strength");
        } else {
          action = "HOLD";
          reasons.push("Flow bullish but weak + TA conflicts → stand aside");
        }
      } else {
        // TA neutral
        if (flowScore.score > 55) {
          action = "LONG";
          reasons.push("Flow bullish, TA neutral — microstructure leading");
        } else {
          action = "HOLD";
          reasons.push("Flow mildly bullish, insufficient edge");
        }
      }
    } else if (flowScore.direction === "bearish") {
      if (taAligned) {
        action = "SHORT";
        confidence = Math.min(98, confidence + 10);
        reasons.push("✓ TA confirms bearish flow (EMA9<EMA21, RSI aligned)");
      } else if (taConflicts) {
        if (flowScore.score < 40) {
          action = "SHORT";
          confidence = Math.max(20, confidence - 12);
          reasons.push("⚠ TA conflicts with flow — proceeding on microstructure strength");
        } else {
          action = "HOLD";
          reasons.push("Flow bearish but weak + TA conflicts → stand aside");
        }
      } else {
        if (flowScore.score < 45) {
          action = "SHORT";
          reasons.push("Flow bearish, TA neutral — microstructure leading");
        } else {
          action = "HOLD";
          reasons.push("Flow mildly bearish, insufficient edge");
        }
      }
    } else {
      reasons.push("Flow neutral — no directional edge from microstructure");
    }

    // Policy confidence gate
    if (action !== "HOLD" && confidence < config.minConfidence) {
      action = "HOLD";
      confidence = Math.min(55, confidence);
      reasons.push(`Policy gate: ${confidence}% < ${config.minConfidence}% min`);
    }

    // ── 4. TP/SL from microstructure ────────────────────
    const direction = action === "LONG" ? 1 : action === "SHORT" ? -1 : 0;
    let stopDistance: number;
    let targetDistance: number;

    if (direction !== 0) {
      // Use ATR if available from klines, else fixed % from spread
      const atrMultiplier = 1.5;
      const priceChanges = closes.slice(-14).map((c, i, arr) =>
        i > 0 ? Math.abs(c - arr[i - 1]) : 0,
      ).filter((v) => v > 0);
      const avgRange = priceChanges.length > 0
        ? priceChanges.reduce((s, v) => s + v, 0) / priceChanges.length
        : price * 0.005;

      // Stop: 1.5x avg range (below noise floor)
      stopDistance = avgRange * atrMultiplier;
      // Target: use risk/reward 2:1 minimum, or depth-based target
      const rrRatio = taAligned ? 2.5 : 2.0;
      targetDistance = stopDistance * rrRatio;

      // If funding extreme, widen target (squeeze potential)
      if (funding && (funding.regime === "extreme_long" || funding.regime === "extreme_short")) {
        targetDistance *= 1.3;
        reasons.push(" widened targets for funding squeeze potential");
      }
    } else {
      stopDistance = price * 0.004;
      targetDistance = price * 0.008;
    }

    // ── 5. Build Signal ─────────────────────────────────
    const regime = action === "LONG"
      ? "TRENDING_UP"
      : action === "SHORT"
        ? "TRENDING_DOWN"
        : "RANGING";

    const momentumDetail = reasons.join(". ");

    const { dimensions, dimensionDetails } = buildLiquidityDimensions(
      confidence,
      momentumDetail,
    );

    // Build factors with microstructure data
    const factors = [
      {
        name: "ORDER_FLOW",
        score: flowScore.tradeFlow.buyPressure,
        weight: 0.35,
        detail: `Buy pressure ${flowScore.tradeFlow.buyPressure.toFixed(0)}%, ` +
          `delta ${flowScore.tradeFlow.deltaVolume > 0 ? "+" : ""}${(flowScore.tradeFlow.deltaVolume).toFixed(0)} vol`,
        bullish: flowScore.tradeFlow.buyPressure > 55,
      },
      {
        name: "DEPTH",
        score: flowScore.depth.imbalance * 100,
        weight: 0.30,
        detail: `Imbalance ${(flowScore.depth.imbalance * 100).toFixed(0)}% bid ` +
          `(${flowScore.depth.levels} levels), spread ${flowScore.depth.spreadBps.toFixed(1)} bps`,
        bullish: flowScore.depth.imbalance > 0.55,
      },
      ...(funding
        ? [{
            name: "FUNDING",
            score: funding.regime === "extreme_short" || funding.regime === "short_heavy" ? 75
              : funding.regime === "extreme_long" || funding.regime === "long_heavy" ? 25
              : 50,
            weight: 0.20,
            detail: `Rate ${(funding.fundingRate * 100).toFixed(4)}%, OI ${funding.openInterest.toFixed(0)}, ${funding.regime}`,
            bullish: funding.regime === "extreme_short" || funding.regime === "short_heavy",
          }]
        : []),
      {
        name: "TA_CONFIRM",
        score: taBullish ? 70 : taBearish ? 30 : 50,
        weight: 0.15,
        detail: `EMA9 ${ema9 > ema21 ? ">" : "<"} EMA21, RSI ${rsi14.toFixed(0)}`,
        bullish: taBullish,
      },
    ];

    return [{
      id: `liquidity-${base}-${Date.now()}`,
      pair,
      action,
      actionV2: action as Signal["actionV2"],
      confidence,
      price,
      change24h,
      reasoning: `[Liquidity Flow] ${momentumDetail}`,
      regime,
      factors,
      confluence: confidence,
      setup: {
        type: action === "HOLD" ? "no_edge" : "trend_continuation",
        direction: action === "LONG" ? "long" : action === "SHORT" ? "short" : "neutral",
        label: action === "HOLD"
          ? "No microstructure edge"
          : funding && (funding.regime === "extreme_long" || funding.regime === "extreme_short")
            ? "Funding squeeze setup"
            : "Order flow continuation",
        thesis: reasons.slice(0, 3).join(". "),
        invalidation: direction !== 0
          ? `Depth imbalance reverses or spread widens above ${Math.max(10, depth.spreadBps * 3).toFixed(0)} bps`
          : "N/A",
        evidence: reasons,
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
        riskReward: action === "HOLD" ? "Stand aside" : `${(targetDistance / stopDistance).toFixed(1)}:1`,
      },
      sources: [
        "SoDEX Orderbook",
        "SoDEX Klines",
        "Strategy Config",
        ...(trades.length > 0 ? ["SoDEX Trades"] : []),
        ...(funding ? ["SoDEX Perps", "Funding Rate"] : []),
        ...(hlFunding.size > 0 ? ["Hyperliquid"] : []),
      ],
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
