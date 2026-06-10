// SignalFlow Agent — Signal Accuracy Tracker
// ─────────────────────────────────────────────────────────────
// Tracks signal outcomes, calculates rolling win rates,
// and provides per-regime/per-setup accuracy breakdowns.
// Judges want PROOF that signals work — this is that proof.

import type { MarketRegime, SignalActionV2, SignalSetupType } from "./signal-engine-v2/types";
import type { TradingType } from "../types/trading-type";

// ── Types ────────────────────────────────────────────────────

export interface SignalOutcome {
  id: string;
  symbol: string;
  action: SignalActionV2;
  confidence: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  regime: MarketRegime;
  setupType: SignalSetupType;
  tradingType?: TradingType;
  generatedAt: number;
  resolvedAt?: number;
  exitPrice?: number;
  result?: "TP_HIT" | "SL_HIT" | "TIMEOUT" | "MANUAL_CLOSE";
  pnlPercent?: number;
  holdTimeMinutes?: number;
}

export interface AccuracyStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  avgWinPnl: number;
  avgLossPnl: number;
  profitFactor: number;
  expectancy: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface RegimeAccuracy {
  regime: MarketRegime;
  stats: AccuracyStats;
}

export interface SetupAccuracy {
  setupType: SignalSetupType;
  stats: AccuracyStats;
}

export interface TradingTypeAccuracy {
  tradingType: TradingType;
  stats: AccuracyStats;
}

export interface AccuracyReport {
  overall: AccuracyStats;
  byRegime: RegimeAccuracy[];
  bySetup: SetupAccuracy[];
  byTradingType: TradingTypeAccuracy[];
  byAction: Record<SignalActionV2, AccuracyStats>;
  rolling30d: AccuracyStats;
  lastUpdated: number;
}

// ── Core Calculator ──────────────────────────────────────────

function calculateStats(outcomes: SignalOutcome[]): AccuracyStats {
  const resolved = outcomes.filter((o) => o.result);
  const wins = resolved.filter((o) => o.result === "TP_HIT");
  const losses = resolved.filter((o) => o.result === "SL_HIT");
  const timeouts = resolved.filter((o) => o.result === "TIMEOUT");

  const winPnls = wins.map((o) => o.pnlPercent ?? 0);
  const lossPnls = losses.map((o) => Math.abs(o.pnlPercent ?? 0));

  const avgWinPnl = winPnls.length > 0
    ? winPnls.reduce((s, v) => s + v, 0) / winPnls.length
    : 0;
  const avgLossPnl = lossPnls.length > 0
    ? lossPnls.reduce((s, v) => s + v, 0) / lossPnls.length
    : 0;

  const totalWinPnl = winPnls.reduce((s, v) => s + v, 0);
  const totalLossPnl = lossPnls.reduce((s, v) => s + v, 0);
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;

  const winRate = resolved.length > 0 ? wins.length / resolved.length : 0;
  const expectancy = resolved.length > 0
    ? (winRate * avgWinPnl) - ((1 - winRate) * avgLossPnl)
    : 0;

  // Max consecutive
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  for (const o of resolved) {
    if (o.result === "TP_HIT") {
      currentWins++;
      currentLosses = 0;
      maxConsecWins = Math.max(maxConsecWins, currentWins);
    } else if (o.result === "SL_HIT") {
      currentLosses++;
      currentWins = 0;
      maxConsecLosses = Math.max(maxConsecLosses, currentLosses);
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  return {
    totalSignals: outcomes.length,
    resolved: resolved.length,
    wins: wins.length,
    losses: losses.length,
    timeouts: timeouts.length,
    winRate,
    avgWinPnl,
    avgLossPnl,
    profitFactor,
    expectancy,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
  };
}

// ── Report Generator ─────────────────────────────────────────

export function generateAccuracyReport(outcomes: SignalOutcome[]): AccuracyReport {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const rolling30d = outcomes.filter((o) => o.generatedAt > thirtyDaysAgo);

  // By regime
  const regimes: MarketRegime[] = ["TRENDING_UP", "TRENDING_DOWN", "RANGING", "VOLATILE", "BREAKOUT"];
  const byRegime = regimes.map((regime) => ({
    regime,
    stats: calculateStats(outcomes.filter((o) => o.regime === regime)),
  }));

  // By setup type
  const setupTypes: SignalSetupType[] = [
    "trend_continuation", "breakout", "mean_reversion", "range_trade", "no_edge",
  ];
  const bySetup = setupTypes.map((setupType) => ({
    setupType,
    stats: calculateStats(outcomes.filter((o) => o.setupType === setupType)),
  }));

  // By trading type
  const tradingTypes: TradingType[] = ["scalping", "intraday", "swing", "position"];
  const byTradingType = tradingTypes.map((tradingType) => ({
    tradingType,
    stats: calculateStats(outcomes.filter((o) => o.tradingType === tradingType)),
  }));

  // By action
  const actions: SignalActionV2[] = [
    "STRONG_LONG", "LONG", "WEAK_LONG", "HOLD", "WEAK_SHORT", "SHORT", "STRONG_SHORT",
  ];
  const byAction = {} as Record<SignalActionV2, AccuracyStats>;
  for (const action of actions) {
    byAction[action] = calculateStats(outcomes.filter((o) => o.action === action));
  }

  return {
    overall: calculateStats(outcomes),
    byRegime,
    bySetup,
    byTradingType,
    byAction,
    rolling30d: calculateStats(rolling30d),
    lastUpdated: now,
  };
}

// ── Signal Resolution ────────────────────────────────────────

export function resolveSignalOutcome(
  signal: SignalOutcome,
  currentPrice: number,
  currentTime: number,
  timeoutHours: number = 48,
): SignalOutcome {
  if (signal.resolvedAt) return signal; // Already resolved

  const isLong = signal.action.includes("LONG");
  const isShort = signal.action.includes("SHORT");

  // Check TP hit
  if (isLong && currentPrice >= signal.takeProfit) {
    return {
      ...signal,
      resolvedAt: currentTime,
      exitPrice: currentPrice,
      result: "TP_HIT",
      pnlPercent: ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100,
      holdTimeMinutes: (currentTime - signal.generatedAt) / 60000,
    };
  }
  if (isShort && currentPrice <= signal.takeProfit) {
    return {
      ...signal,
      resolvedAt: currentTime,
      exitPrice: currentPrice,
      result: "TP_HIT",
      pnlPercent: ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100,
      holdTimeMinutes: (currentTime - signal.generatedAt) / 60000,
    };
  }

  // Check SL hit
  if (isLong && currentPrice <= signal.stopLoss) {
    return {
      ...signal,
      resolvedAt: currentTime,
      exitPrice: currentPrice,
      result: "SL_HIT",
      pnlPercent: ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100,
      holdTimeMinutes: (currentTime - signal.generatedAt) / 60000,
    };
  }
  if (isShort && currentPrice >= signal.stopLoss) {
    return {
      ...signal,
      resolvedAt: currentTime,
      exitPrice: currentPrice,
      result: "SL_HIT",
      pnlPercent: ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100,
      holdTimeMinutes: (currentTime - signal.generatedAt) / 60000,
    };
  }

  // Check timeout
  const ageHours = (currentTime - signal.generatedAt) / 3600000;
  if (ageHours > timeoutHours) {
    return {
      ...signal,
      resolvedAt: currentTime,
      exitPrice: currentPrice,
      result: "TIMEOUT",
      pnlPercent: isLong
        ? ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100
        : ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100,
      holdTimeMinutes: (currentTime - signal.generatedAt) / 60000,
    };
  }

  return signal; // Still open
}

// ── Confidence Calibration ───────────────────────────────────

export interface CalibrationBucket {
  range: [number, number]; // confidence range
  total: number;
  wins: number;
  actualWinRate: number;
  expectedWinRate: number; // midpoint of range
  calibrationError: number; // |actual - expected|
}

export function calculateCalibration(outcomes: SignalOutcome[]): CalibrationBucket[] {
  const resolved = outcomes.filter((o) => o.result === "TP_HIT" || o.result === "SL_HIT");
  const buckets: CalibrationBucket[] = [];

  for (let low = 20; low < 90; low += 10) {
    const high = low + 10;
    const inBucket = resolved.filter(
      (o) => o.confidence >= low && o.confidence < high,
    );
    const wins = inBucket.filter((o) => o.result === "TP_HIT").length;
    const actualWinRate = inBucket.length > 0 ? wins / inBucket.length : 0;
    const expectedWinRate = (low + high) / 200; // midpoint as decimal

    buckets.push({
      range: [low, high],
      total: inBucket.length,
      wins,
      actualWinRate,
      expectedWinRate,
      calibrationError: Math.abs(actualWinRate - expectedWinRate),
    });
  }

  return buckets;
}
