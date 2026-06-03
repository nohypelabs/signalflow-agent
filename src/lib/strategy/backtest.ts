// SignalFlow Agent — Signal Backtest Engine
// ─────────────────────────────────────────────────────────────
// Replays historical klines through the V2 signal engine
// and evaluates signal accuracy over configurable resolution windows.
//
// Method: Walk-forward sliding window
// - Generate signal using bars [i..i+lookback]
// - Evaluate whether TP/SL is reached first inside the resolution window
// - Track: setup quality, correct/incorrect, profit/loss, per-type stats

import { generateSignalV2 } from "./signal-engine-v2";
import type { SoDEXKline } from "../sodex-types";
import type { TradingType } from "../types/trading-type";

// ── Types ──────────────────────────────────────────────────

export interface BacktestSignal {
  index: number;
  timestamp: number;
  pair: string;
  action: string;
  confidence: number;
  confluence: number;
  regime: string;
  setupType: string;
  setupLabel: string;
  qualityStatus: "actionable" | "watch" | "blocked";
  confidenceRaw: number;
  confidenceAdjustment: number;
  price: number;
  takeProfit: number;
  stopLoss: number;
  // Outcome
  outcomePrice: number | null;
  exitIndex: number | null;
  exitReason: "TAKE_PROFIT" | "STOP_LOSS" | "WINDOW_CLOSE" | null;
  outcome: "WIN" | "LOSS" | "NEUTRAL" | null;
  pnlPercent: number | null;
  directionCorrect: boolean | null;
}

export interface BacktestResult {
  pair: string;
  tradingType?: TradingType;
  lookback: number;
  resolution: number;
  totalBars: number;
  totalSignals: number;
  // Performance
  wins: number;
  losses: number;
  neutrals: number;
  winRate: number;
  // P&L
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnl: number;
  maxDrawdown: number;
  // Streaks
  maxWinStreak: number;
  maxLossStreak: number;
  // Per-action breakdown
  longSignals: number;
  shortSignals: number;
  longWinRate: number;
  shortWinRate: number;
  // Per-regime breakdown
  regimeAccuracy: Record<string, { total: number; wins: number; accuracy: number }>;
  // Per-setup breakdown
  setupAccuracy: Record<string, { total: number; wins: number; losses: number; neutrals: number; accuracy: number; profitFactor: number }>;
  // Signal list
  signals: BacktestSignal[];
  // Equity curve
  equityCurve: { index: number; value: number }[];
}

// ── Main backtest function ─────────────────────────────────

export function runBacktest(
  klines: SoDEXKline[],
  pair: string,
  options: {
    lookback?: number;     // bars for signal generation (default: 60)
    step?: number;         // step size between signals (default: 4)
    resolution?: number;   // bars to look ahead for outcome (default: 12)
    tradingType?: TradingType;
    feeBps?: number;
    slippageBps?: number;
  } = {},
): BacktestResult {
  const {
    lookback = 60,
    step = 4,
    resolution = 12,
    tradingType,
    feeBps = 2,
    slippageBps = 3,
  } = options;

  // Normalize klines
  const sorted = [...klines]
    .map((k) => ({
      time: typeof k.t === "string" ? parseInt(k.t, 10) : k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      q: k.q,
    }))
    .sort((a, b) => a.time - b.time);

  const totalBars = sorted.length;
  if (totalBars < lookback + resolution) {
    return emptyResult(pair, tradingType, lookback, resolution, totalBars);
  }

  const signals: BacktestSignal[] = [];
  let equity = 10000;
  const equityCurve: { index: number; value: number }[] = [{ index: 0, value: equity }];
  let maxEquity = equity;
  let maxDrawdown = 0;
  let winStreak = 0;
  let lossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  // Slide through klines
  for (let i = lookback; i < totalBars - resolution; i += step) {
    // Get klines window for signal generation
    const windowKlines = sorted.slice(i - lookback, i);

    // Convert back to SoDEXKline format
    const sodexKlines: SoDEXKline[] = windowKlines.map((k) => ({
      t: k.time,
      o: k.open.toString(),
      h: k.high.toString(),
      l: k.low.toString(),
      c: k.close.toString(),
      v: k.volume.toString(),
      q: k.q,
    }));

    // Generate signal
    const signal = generateSignalV2({
      pair,
      klines: sodexKlines,
      tradingType,
    });

    if (!signal || signal.action === "HOLD") continue;

    const entryPrice = sorted[i].close;
    const isBuy = signal.action.includes("LONG");
    const isSell = signal.action.includes("SHORT");
    const outcomeWindow = sorted.slice(i + 1, Math.min(i + resolution + 1, totalBars));

    let pnlPercent: number | null = null;
    let outcome: "WIN" | "LOSS" | "NEUTRAL" | null = null;
    let directionCorrect: boolean | null = null;
    let outcomePrice: number | null = null;
    let exitIndex: number | null = null;
    let exitReason: BacktestSignal["exitReason"] = null;

    if (isBuy || isSell) {
      const exit = evaluateTradePath({
        bars: outcomeWindow,
        startIndex: i + 1,
        isBuy,
        entryPrice,
        takeProfit: signal.execution.takeProfit,
        stopLoss: signal.execution.stopLoss,
      });

      outcomePrice = exit.exitPrice;
      exitIndex = exit.exitIndex;
      exitReason = exit.exitReason;

      const grossPnl = isBuy
        ? ((exit.exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exit.exitPrice) / entryPrice) * 100;
      const roundTripCostPct = ((feeBps + slippageBps) * 2) / 100;
      pnlPercent = grossPnl - roundTripCostPct;

      directionCorrect = pnlPercent > 0;
      outcome = exit.exitReason === "TAKE_PROFIT"
        ? "WIN"
        : exit.exitReason === "STOP_LOSS"
          ? "LOSS"
          : pnlPercent > 0.1 ? "WIN" : pnlPercent < -0.1 ? "LOSS" : "NEUTRAL";

      // Update equity
      const positionSize = 0.05; // 5% per trade
      equity += equity * positionSize * (pnlPercent / 100);
      maxEquity = Math.max(maxEquity, equity);
      const drawdown = ((maxEquity - equity) / maxEquity) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      // Track streaks
      if (outcome === "WIN") {
        winStreak++;
        lossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, winStreak);
      } else if (outcome === "LOSS") {
        lossStreak++;
        winStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, lossStreak);
      }
    }

    signals.push({
      index: i,
      timestamp: sorted[i].time,
      pair,
      action: signal.action,
      confidence: signal.confidence,
      confluence: signal.confluence,
      regime: signal.regime,
      setupType: signal.setup.type,
      setupLabel: signal.setup.label,
      qualityStatus: signal.quality.status,
      confidenceRaw: signal.quality.rawConfidence,
      confidenceAdjustment: signal.quality.confidenceAdjustment,
      price: entryPrice,
      takeProfit: signal.execution.takeProfit,
      stopLoss: signal.execution.stopLoss,
      outcomePrice,
      exitIndex,
      exitReason,
      outcome,
      pnlPercent: pnlPercent !== null ? parseFloat(pnlPercent.toFixed(3)) : null,
      directionCorrect,
    });

    equityCurve.push({ index: i, value: parseFloat(equity.toFixed(2)) });
  }

  // ── Compute metrics ───────────────────────────────────
  const actionable = signals.filter((s) => s.outcome !== null);
  const wins = actionable.filter((s) => s.outcome === "WIN").length;
  const losses = actionable.filter((s) => s.outcome === "LOSS").length;
  const neutrals = actionable.filter((s) => s.outcome === "NEUTRAL").length;
  const total = wins + losses + neutrals;

  const winPnls = actionable.filter((s) => s.outcome === "WIN").map((s) => s.pnlPercent ?? 0);
  const lossPnls = actionable.filter((s) => s.outcome === "LOSS").map((s) => s.pnlPercent ?? 0);

  const avgWin = winPnls.length > 0 ? winPnls.reduce((s, v) => s + v, 0) / winPnls.length : 0;
  const avgLoss = lossPnls.length > 0 ? Math.abs(lossPnls.reduce((s, v) => s + v, 0) / lossPnls.length) : 0;
  const grossProfit = winPnls.reduce((s, v) => s + v, 0);
  const grossLoss = Math.abs(lossPnls.reduce((s, v) => s + v, 0));

  // Per-action breakdown
  const longSignals = actionable.filter((s) => s.action.includes("LONG")).length;
  const shortSignals = actionable.filter((s) => s.action.includes("SHORT")).length;
  const longWins = actionable.filter((s) => s.action.includes("LONG") && s.outcome === "WIN").length;
  const shortWins = actionable.filter((s) => s.action.includes("SHORT") && s.outcome === "WIN").length;

  // Per-regime breakdown
  const regimeAccuracy: Record<string, { total: number; wins: number; accuracy: number }> = {};
  for (const s of actionable) {
    const r = s.regime;
    if (!regimeAccuracy[r]) regimeAccuracy[r] = { total: 0, wins: 0, accuracy: 0 };
    regimeAccuracy[r].total++;
    if (s.outcome === "WIN") regimeAccuracy[r].wins++;
  }
  for (const r of Object.keys(regimeAccuracy)) {
    regimeAccuracy[r].accuracy = regimeAccuracy[r].total > 0
      ? parseFloat(((regimeAccuracy[r].wins / regimeAccuracy[r].total) * 100).toFixed(1))
      : 0;
  }

  const setupAccuracy = buildSetupAccuracy(actionable);

  return {
    pair,
    tradingType,
    lookback,
    resolution,
    totalBars,
    totalSignals: signals.length,
    wins,
    losses,
    neutrals,
    winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
    avgWin: parseFloat(avgWin.toFixed(3)),
    avgLoss: parseFloat(avgLoss.toFixed(3)),
    profitFactor: grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? Infinity : 0,
    totalPnl: parseFloat(((equity - 10000) / 100).toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxWinStreak,
    maxLossStreak,
    longSignals,
    shortSignals,
    longWinRate: longSignals > 0 ? parseFloat(((longWins / longSignals) * 100).toFixed(1)) : 0,
    shortWinRate: shortSignals > 0 ? parseFloat(((shortWins / shortSignals) * 100).toFixed(1)) : 0,
    regimeAccuracy,
    setupAccuracy,
    signals,
    equityCurve,
  };
}

type NormalizedBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  q?: string;
};

function evaluateTradePath(input: {
  bars: NormalizedBar[];
  startIndex: number;
  isBuy: boolean;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
}): { exitPrice: number; exitIndex: number; exitReason: NonNullable<BacktestSignal["exitReason"]> } {
  const fallbackIndex = Math.max(input.startIndex, input.startIndex + input.bars.length - 1);
  const fallbackPrice = input.bars[input.bars.length - 1]?.close ?? input.entryPrice;

  for (let offset = 0; offset < input.bars.length; offset++) {
    const bar = input.bars[offset];
    const exitIndex = input.startIndex + offset;
    const hitStop = input.isBuy ? bar.low <= input.stopLoss : bar.high >= input.stopLoss;
    const hitTarget = input.isBuy ? bar.high >= input.takeProfit : bar.low <= input.takeProfit;

    if (hitStop && hitTarget) {
      return { exitPrice: input.stopLoss, exitIndex, exitReason: "STOP_LOSS" };
    }
    if (hitStop) {
      return { exitPrice: input.stopLoss, exitIndex, exitReason: "STOP_LOSS" };
    }
    if (hitTarget) {
      return { exitPrice: input.takeProfit, exitIndex, exitReason: "TAKE_PROFIT" };
    }
  }

  return { exitPrice: fallbackPrice, exitIndex: fallbackIndex, exitReason: "WINDOW_CLOSE" };
}

function buildSetupAccuracy(
  signals: BacktestSignal[],
): BacktestResult["setupAccuracy"] {
  const setupAccuracy: BacktestResult["setupAccuracy"] = {};

  for (const signal of signals) {
    const key = signal.setupType;
    if (!setupAccuracy[key]) {
      setupAccuracy[key] = {
        total: 0,
        wins: 0,
        losses: 0,
        neutrals: 0,
        accuracy: 0,
        profitFactor: 0,
      };
    }
    setupAccuracy[key].total++;
    if (signal.outcome === "WIN") setupAccuracy[key].wins++;
    if (signal.outcome === "LOSS") setupAccuracy[key].losses++;
    if (signal.outcome === "NEUTRAL") setupAccuracy[key].neutrals++;
  }

  for (const [setupType, stats] of Object.entries(setupAccuracy)) {
    const setupSignals = signals.filter((signal) => signal.setupType === setupType);
    const grossProfit = setupSignals
      .filter((signal) => signal.outcome === "WIN")
      .reduce((sum, signal) => sum + Math.max(0, signal.pnlPercent ?? 0), 0);
    const grossLoss = Math.abs(
      setupSignals
        .filter((signal) => signal.outcome === "LOSS")
        .reduce((sum, signal) => sum + Math.min(0, signal.pnlPercent ?? 0), 0),
    );

    stats.accuracy = stats.total > 0
      ? parseFloat(((stats.wins / stats.total) * 100).toFixed(1))
      : 0;
    stats.profitFactor = grossLoss > 0
      ? parseFloat((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0 ? Infinity : 0;
  }

  return setupAccuracy;
}

// ── Empty result helper ────────────────────────────────────

function emptyResult(
  pair: string,
  tradingType: TradingType | undefined,
  lookback: number,
  resolution: number,
  totalBars: number,
): BacktestResult {
  return {
    pair,
    tradingType,
    lookback,
    resolution,
    totalBars,
    totalSignals: 0,
    wins: 0,
    losses: 0,
    neutrals: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    totalPnl: 0,
    maxDrawdown: 0,
    maxWinStreak: 0,
    maxLossStreak: 0,
    longSignals: 0,
    shortSignals: 0,
    longWinRate: 0,
    shortWinRate: 0,
    regimeAccuracy: {},
    setupAccuracy: {},
    signals: [],
    equityCurve: [],
  };
}
