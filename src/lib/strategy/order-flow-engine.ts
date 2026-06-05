// SignalFlow Agent — Order Flow Analysis Engine
// ─────────────────────────────────────────────────────────────
// Microstructure analysis from the SOURCE — orderbook depth,
// trade flow, funding rate, open interest. No lagging chart
// indicators. This is what whales and quants actually watch.

import type { OrderBook } from "../sodex-types";
import type { SoDEXPerpsTicker } from "../sodex-perps";
import type { SoDEXTrade } from "../types/trade";

// ── Types ────────────────────────────────────────────────────

export interface TradeFlowMetrics {
  /** % of market orders that are buys (0-100) */
  buyPressure: number;
  /** Net volume: buy volume - sell volume (in quote) */
  deltaVolume: number;
  /** Total trade volume analyzed (quote) */
  totalVolume: number;
  /** Number of trades analyzed */
  tradeCount: number;
  /** Number of large trades (>2x avg size) */
  largeTradeCount: number;
  /** Direction of large trades: positive = buying, negative = selling */
  largeTradeDirection: number;
  /** Trades per second (velocity = urgency) */
  tradeVelocity: number;
  /** Volume-weighted average price of buys vs sells */
  vwapBuy: number;
  vwapSell: number;
}

export interface DepthMetrics {
  /** Bid/ask imbalance: >0.5 = bid-heavy (bullish), <0.5 = ask-heavy */
  imbalance: number;
  /** Imbalance strength: 0 = balanced, 100 = one-sided */
  imbalanceStrength: number;
  /** Total bid depth analyzed (in base units) */
  totalBidDepth: number;
  /** Total ask depth analyzed (in base units) */
  totalAskDepth: number;
  /** Bid wall: largest single bid order size */
  bidWall: number;
  /** Ask wall: largest single ask order size */
  askWall: number;
  /** Bid wall price level */
  bidWallPrice: number;
  /** Ask wall price level */
  askWallPrice: number;
  /** Spread in basis points */
  spreadBps: number;
  /** Mid price */
  midPrice: number;
  /** Depth levels analyzed */
  levels: number;
}

export interface FundingMetrics {
  /** Current funding rate (e.g. 0.0001 = 0.01%) */
  fundingRate: number;
  /** Open interest in quote currency */
  openInterest: number;
  /** Mark price */
  markPrice: number;
  /** Index price */
  indexPrice: number;
  /** Basis: (mark - index) / index * 100 in bps */
  basisBps: number;
  /** Hyperliquid funding for cross-venue comparison */
  hlFundingRate: number | null;
  /** Cross-venue funding divergence (SoDEX vs HL) in bps */
  fundingDivergenceBps: number | null;
  /** Funding regime label */
  regime: "neutral" | "long_heavy" | "short_heavy" | "extreme_long" | "extreme_short";
}

export interface OrderFlowScore {
  /** Composite order flow score: 0-100, >50 = bullish, <50 = bearish */
  score: number;
  /** Trade flow component */
  tradeFlow: TradeFlowMetrics;
  /** Depth analysis component */
  depth: DepthMetrics;
  /** Funding + OI component (null if perps data unavailable) */
  funding: FundingMetrics | null;
  /** Human-readable breakdown */
  breakdown: string[];
  /** Signal direction */
  direction: "bullish" | "bearish" | "neutral";
  /** Confidence from microstructure (20-98) */
  confidence: number;
}

// ── Trade Flow Analysis ──────────────────────────────────────

function numberVal(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function analyzeTradeFlow(
  trades: SoDEXTrade[],
  windowMs: number = 5 * 60_000, // 5-minute window
): TradeFlowMetrics {
  if (trades.length === 0) {
    return {
      buyPressure: 50,
      deltaVolume: 0,
      totalVolume: 0,
      tradeCount: 0,
      largeTradeCount: 0,
      largeTradeDirection: 0,
      tradeVelocity: 0,
      vwapBuy: 0,
      vwapSell: 0,
    };
  }

  const now = Date.now();
  const cutoff = now - windowMs;
  // Filter to recent trades in window
  const recent = trades.filter((t) => numberVal(t.T) * 1000 > cutoff);
  const pool = recent.length > 0 ? recent : trades.slice(-100);

  let buyVolume = 0;
  let sellVolume = 0;
  let buyQuoteVol = 0;
  let sellQuoteVol = 0;
  let buyCount = 0;
  let sellCount = 0;
  let buyVwapNum = 0;
  let buyVwapDen = 0;
  let sellVwapNum = 0;
  let sellVwapDen = 0;

  const sizes: number[] = [];

  for (const trade of pool) {
    const price = numberVal(trade.p);
    const qty = numberVal(trade.q);
    const quoteVol = price * qty;
    sizes.push(qty);

    const isBuy = trade.S === "BUY";

    if (isBuy) {
      buyVolume += qty;
      buyQuoteVol += quoteVol;
      buyCount++;
      buyVwapNum += price * qty;
      buyVwapDen += qty;
    } else {
      sellVolume += qty;
      sellQuoteVol += quoteVol;
      sellCount++;
      sellVwapNum += price * qty;
      sellVwapDen += qty;
    }
  }

  const totalVol = buyQuoteVol + sellQuoteVol;
  const avgSize = sizes.length > 0
    ? sizes.reduce((s, v) => s + v, 0) / sizes.length
    : 0;

  // Large trades detection (>2x average)
  let largeBuys = 0;
  let largeSells = 0;
  for (const trade of pool) {
    const qty = numberVal(trade.q);
    if (qty > avgSize * 2) {
      if (trade.S === "BUY") largeBuys++;
      else largeSells++;
    }
  }

  // Time span for velocity
  const timestamps = pool.map((t) => numberVal(t.T));
  const timeSpan = timestamps.length >= 2
    ? (Math.max(...timestamps) - Math.min(...timestamps))
    : 1;
  const velocity = timeSpan > 0 ? pool.length / timeSpan : 0;

  return {
    buyPressure: totalVol > 0 ? (buyQuoteVol / totalVol) * 100 : 50,
    deltaVolume: buyQuoteVol - sellQuoteVol,
    totalVolume: totalVol,
    tradeCount: pool.length,
    largeTradeCount: largeBuys + largeSells,
    largeTradeDirection: (largeBuys + largeSells) > 0
      ? (largeBuys - largeSells) / (largeBuys + largeSells)
      : 0,
    tradeVelocity: velocity,
    vwapBuy: buyVwapDen > 0 ? buyVwapNum / buyVwapDen : 0,
    vwapSell: sellVwapDen > 0 ? sellVwapNum / sellVwapDen : 0,
  };
}

// ── Depth Analysis ───────────────────────────────────────────

export function analyzeDepth(
  orderbook: OrderBook | undefined | null,
  levels: number = 20,
): DepthMetrics {
  if (!orderbook || !orderbook.bids?.length || !orderbook.asks?.length) {
    return {
      imbalance: 0.5,
      imbalanceStrength: 0,
      totalBidDepth: 0,
      totalAskDepth: 0,
      bidWall: 0,
      askWall: 0,
      bidWallPrice: 0,
      askWallPrice: 0,
      spreadBps: Infinity,
      midPrice: 0,
      levels: 0,
    };
  }

  const bids = orderbook.bids.slice(0, levels);
  const asks = orderbook.asks.slice(0, levels);

  const bestBid = numberVal(bids[0]?.[0]);
  const bestAsk = numberVal(asks[0]?.[0]);
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
  const spreadBps = midPrice > 0
    ? ((bestAsk - bestBid) / midPrice) * 10_000
    : Infinity;

  let totalBidDepth = 0;
  let totalAskDepth = 0;
  let bidWall = 0;
  let askWall = 0;
  let bidWallPrice = 0;
  let askWallPrice = 0;

  for (const [priceStr, qtyStr] of bids) {
    const qty = numberVal(qtyStr);
    const price = numberVal(priceStr);
    totalBidDepth += qty * price; // quote-weighted
    if (qty > bidWall) {
      bidWall = qty;
      bidWallPrice = price;
    }
  }

  for (const [priceStr, qtyStr] of asks) {
    const qty = numberVal(qtyStr);
    const price = numberVal(priceStr);
    totalAskDepth += qty * price; // quote-weighted
    if (qty > askWall) {
      askWall = qty;
      askWallPrice = price;
    }
  }

  const totalDepth = totalBidDepth + totalAskDepth;
  const imbalance = totalDepth > 0 ? totalBidDepth / totalDepth : 0.5;
  const imbalanceStrength = Math.abs(imbalance - 0.5) * 200; // 0-100

  return {
    imbalance,
    imbalanceStrength,
    totalBidDepth,
    totalAskDepth,
    bidWall,
    askWall,
    bidWallPrice,
    askWallPrice,
    spreadBps,
    midPrice,
    levels: Math.min(bids.length, asks.length),
  };
}

// ── Funding Rate Analysis ────────────────────────────────────

export function analyzeFunding(
  perpsTicker: SoDEXPerpsTicker | undefined | null,
  hlFundingRate: number | null = null,
): FundingMetrics | null {
  if (!perpsTicker) return null;

  const fundingRate = Number(perpsTicker.fundingRate ?? 0);
  const openInterest = Number(perpsTicker.openInterest ?? 0);
  const markPrice = Number(perpsTicker.markPrice ?? 0);
  const indexPrice = Number(perpsTicker.indexPrice ?? 0);

  const basisBps = indexPrice > 0
    ? ((markPrice - indexPrice) / indexPrice) * 10_000
    : 0;

  const fundingDivergenceBps = hlFundingRate !== null
    ? (fundingRate - hlFundingRate) * 10_000
    : null;

  // Funding regime classification
  // Annualized: fundingRate * 3 * 365 (3 funding periods/day)
  const annualized = Math.abs(fundingRate) * 3 * 365 * 100; // in %
  let regime: FundingMetrics["regime"] = "neutral";
  if (fundingRate > 0) {
    regime = annualized > 50 ? "extreme_long" : annualized > 15 ? "long_heavy" : "neutral";
  } else if (fundingRate < 0) {
    regime = annualized > 50 ? "extreme_short" : annualized > 15 ? "short_heavy" : "neutral";
  }

  return {
    fundingRate,
    openInterest,
    markPrice,
    indexPrice,
    basisBps,
    hlFundingRate,
    fundingDivergenceBps,
    regime,
  };
}

// ── Composite Order Flow Score ───────────────────────────────

export function scoreOrderFlow(input: {
  tradeFlow: TradeFlowMetrics;
  depth: DepthMetrics;
  funding: FundingMetrics | null;
}): OrderFlowScore {
  const { tradeFlow, depth, funding } = input;
  const breakdown: string[] = [];
  let score = 50; // neutral
  let confidence = 50;

  // ── Factor 1: Trade Flow (weight: 35%) ──────────────
  // Buy pressure >65% is bullish, <35% is bearish
  const flowScore = tradeFlow.buyPressure; // 0-100
  const flowDelta = (tradeFlow.buyPressure - 50) * 0.7; // max ±35
  score += flowDelta;

  if (tradeFlow.buyPressure > 65) {
    breakdown.push(`Buy pressure ${(tradeFlow.buyPressure).toFixed(0)}% (strong buying)`);
  } else if (tradeFlow.buyPressure < 35) {
    breakdown.push(`Sell pressure ${(100 - tradeFlow.buyPressure).toFixed(0)}% (strong selling)`);
  } else {
    breakdown.push(`Flow balanced at ${tradeFlow.buyPressure.toFixed(0)}%`);
  }

  // Large trade direction bonus (whale activity)
  if (tradeFlow.largeTradeCount > 0) {
    const largeBias = tradeFlow.largeTradeDirection * 8; // ±8
    score += largeBias;
    if (tradeFlow.largeTradeDirection > 0.3) {
      breakdown.push(`${tradeFlow.largeTradeCount} large buys detected (whale accumulation)`);
    } else if (tradeFlow.largeTradeDirection < -0.3) {
      breakdown.push(`${tradeFlow.largeTradeCount} large sells detected (whale distribution)`);
    }
  }

  // Trade velocity (high velocity = urgency)
  if (tradeFlow.tradeVelocity > 1) {
    confidence += 5; // active market
  }

  // ── Factor 2: Depth Imbalance (weight: 30%) ─────────
  const depthDelta = (depth.imbalance - 0.5) * 60; // max ±30
  score += depthDelta;

  if (depth.imbalanceStrength > 30) {
    breakdown.push(
      `Depth ${depth.imbalance > 0.5 ? "bid" : "ask"}-heavy ` +
      `(${depth.imbalanceStrength.toFixed(0)}% imbalance)`,
    );
  }

  // Bid/ask wall detection
  const wallRatio = depth.totalAskDepth > 0
    ? depth.bidWall / depth.askWall
    : depth.bidWall > 0 ? 2 : 1;

  if (wallRatio > 2) {
    score += 3;
    breakdown.push(`Bid wall at ${depth.bidWallPrice.toFixed(2)} (${depth.bidWall.toFixed(2)} base)`);
  } else if (wallRatio < 0.5) {
    score -= 3;
    breakdown.push(`Ask wall at ${depth.askWallPrice.toFixed(2)} (${depth.askWall.toFixed(2)} base)`);
  }

  // Spread quality
  if (depth.spreadBps <= 1) {
    confidence += 5; // tight spread = liquid market
    breakdown.push(`Tight spread ${depth.spreadBps.toFixed(2)} bps`);
  } else if (depth.spreadBps > 10) {
    confidence -= 10; // wide spread = illiquid, risky
    breakdown.push(`Wide spread ${depth.spreadBps.toFixed(1)} bps (illiquid)`);
  }

  // ── Factor 3: Funding Rate + OI (weight: 35%) ───────
  if (funding) {
    // Funding rate as contrarian signal at extremes
    const annualizedPct = Math.abs(funding.fundingRate) * 3 * 365 * 100;

    if (funding.regime === "extreme_long") {
      // Overleveraged longs → contrarian bearish
      score -= 12;
      confidence += 5;
      breakdown.push(`Extreme long funding ${annualizedPct.toFixed(0)}% ann (squeeze risk)`);
    } else if (funding.regime === "extreme_short") {
      // Overleveraged shorts → contrarian bullish
      score += 12;
      confidence += 5;
      breakdown.push(`Extreme short funding ${annualizedPct.toFixed(0)}% ann (short squeeze)`);
    } else if (funding.regime === "long_heavy") {
      score -= 5;
      breakdown.push(`Moderate long bias funding ${annualizedPct.toFixed(0)}% ann`);
    } else if (funding.regime === "short_heavy") {
      score += 5;
      breakdown.push(`Moderate short bias funding ${annualizedPct.toFixed(0)}% ann`);
    }

    // Basis analysis: mark > index = premium (overbought), mark < index = discount
    if (Math.abs(funding.basisBps) > 20) {
      const basisDelta = -funding.basisBps * 0.1; // contrarian
      score += Math.max(-8, Math.min(8, basisDelta));
      breakdown.push(
        `${funding.basisBps > 0 ? "Premium" : "Discount"} ` +
        `${Math.abs(funding.basisBps).toFixed(1)} bps vs index`,
      );
    }

    // Cross-venue funding divergence
    if (funding.fundingDivergenceBps !== null && Math.abs(funding.fundingDivergenceBps) > 5) {
      if (funding.fundingDivergenceBps > 0) {
        // SoDEX more positive than HL → locals more long
        score -= 3;
        breakdown.push(`SoDEX funding higher than Hyperliquid by ${funding.fundingDivergenceBps.toFixed(1)} bps`);
      } else {
        score += 3;
        breakdown.push(`SoDEX funding lower than Hyperliquid by ${Math.abs(funding.fundingDivergenceBps).toFixed(1)} bps`);
      }
    }
  } else {
    // No perps data — reduce weight of this factor
    // Redistribute to depth (which we do have)
    score += (depth.imbalance - 0.5) * 10; // extra depth weight
    breakdown.push("Perps data unavailable (funding/OI excluded)");
  }

  // ── Final clamping ──────────────────────────────────
  score = Math.max(5, Math.min(95, Math.round(score)));
  confidence = Math.max(20, Math.min(98, Math.round(confidence)));

  let direction: "bullish" | "bearish" | "neutral";
  if (score > 58) direction = "bullish";
  else if (score < 42) direction = "bearish";
  else direction = "neutral";

  // Boost confidence if all signals agree
  const flowDir = tradeFlow.buyPressure > 55 ? "bullish" : tradeFlow.buyPressure < 45 ? "bearish" : "neutral";
  const depthDir = depth.imbalance > 0.55 ? "bullish" : depth.imbalance < 0.45 ? "bearish" : "neutral";

  if (flowDir === direction && depthDir === direction) {
    confidence = Math.min(98, confidence + 8);
    breakdown.push("Trade flow + depth aligned ↑");
  } else if (flowDir !== "neutral" && depthDir !== "neutral" && flowDir !== depthDir) {
    confidence = Math.max(20, confidence - 10);
    breakdown.push("⚠ Flow and depth conflict");
  }

  return { score, tradeFlow, depth, funding, breakdown, direction, confidence };
}
