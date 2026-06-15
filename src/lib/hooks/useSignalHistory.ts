"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Signal, RecordedSignal } from "../types/signal";

export type { RecordedSignal };

const STORAGE_KEY = "signalflow_signal_history";
const MAX_HISTORY = 500;

export type ResolutionWindow = "1h" | "4h" | "24h" | "7d";

const RESOLUTION_MS: Record<ResolutionWindow, number> = {
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

function load(): RecordedSignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(history: RecordedSignal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // storage full
  }
}

function isSignalCorrect(signal: RecordedSignal, currentPrice: number): boolean {
  const exec = signal.execution;

  if (exec) {
    const { entry, takeProfit, stopLoss } = exec;

    if (signal.action === "LONG") {
      // Correct if price moved in the right direction OR reached TP
      // Wrong if hit stop loss
      if (stopLoss != null && currentPrice <= stopLoss) return false;
      if (takeProfit != null && currentPrice >= takeProfit) return true;
      return currentPrice > entry;
    }

    if (signal.action === "SHORT") {
      // Correct if price moved in the right direction OR reached TP
      // Wrong if hit stop loss
      if (stopLoss != null && currentPrice >= stopLoss) return false;
      if (takeProfit != null && currentPrice <= takeProfit) return true;
      return currentPrice < entry;
    }

    // HOLD: price didn't move much from entry (within 2%)
    return Math.abs(currentPrice - entry) / entry <= 0.02;
  }

  // Legacy fallback (for old history entries without execution)
  if (signal.action === "LONG") return currentPrice > signal.price;
  if (signal.action === "SHORT") return currentPrice < signal.price;
  return Math.abs(currentPrice - signal.price) / signal.price <= 0.02;
}

/* ── Confidence calibration buckets ── */

export interface CalibrationBucket {
  range: string;
  min: number;
  max: number;
  total: number;
  correct: number;
  accuracy: number | null;
}

function buildCalibration(history: RecordedSignal[]): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [
    { range: "50-59%", min: 50, max: 60, total: 0, correct: 0, accuracy: null },
    { range: "60-69%", min: 60, max: 70, total: 0, correct: 0, accuracy: null },
    { range: "70-79%", min: 70, max: 80, total: 0, correct: 0, accuracy: null },
    { range: "80-89%", min: 80, max: 90, total: 0, correct: 0, accuracy: null },
    { range: "90-100%", min: 90, max: 101, total: 0, correct: 0, accuracy: null },
  ];

  const resolved = history.filter((s) => s.resolved);
  for (const s of resolved) {
    const bucket = buckets.find((b) => s.confidence >= b.min && s.confidence < b.max);
    if (bucket) {
      bucket.total++;
      if (s.resolved?.correct) bucket.correct++;
    }
  }

  for (const b of buckets) {
    b.accuracy = b.total > 0 ? (b.correct / b.total) * 100 : null;
  }

  return buckets;
}

/* ── Equity curve ── */

export interface EquityPoint {
  timestamp: number;
  value: number;
  signalId: string;
  action: string;
  correct: boolean | null;
}

function buildEquityCurve(history: RecordedSignal[], startValue = 10000): EquityPoint[] {
  const points: EquityPoint[] = [{ timestamp: Date.now() - 86400000 * 30, value: startValue, signalId: "start", action: "START", correct: null }];

  // Sort by timestamp ascending
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  let value = startValue;
  const POSITION_SIZE = 0.05; // 5% per trade

  for (const s of sorted) {
    if (!s.resolved) continue;
    const pnl = s.resolved.correct ? POSITION_SIZE * 0.02 : -POSITION_SIZE * 0.01; // simplified P&L
    value = value * (1 + pnl);
    points.push({
      timestamp: s.resolved.resolvedAt,
      value: Math.round(value * 100) / 100,
      signalId: s.id,
      action: s.action,
      correct: s.resolved.correct,
    });
  }

  return points;
}

/* ── Max drawdown ── */

export interface DrawdownResult {
  maxDrawdown: number; // percentage
  peakValue: number;
  troughValue: number;
  recoverySignals: number;
}

function computeMaxDrawdown(curve: EquityPoint[]): DrawdownResult {
  if (curve.length < 2) return { maxDrawdown: 0, peakValue: 10000, troughValue: 10000, recoverySignals: 0 };

  let peak = curve[0].value;
  let maxDD = 0;
  let peakAt = peak;
  let troughAt = peak;

  for (const p of curve) {
    if (p.value > peak) peak = p.value;
    const dd = (peak - p.value) / peak;
    if (dd > maxDD) {
      maxDD = dd;
      peakAt = peak;
      troughAt = p.value;
    }
  }

  // Recovery signals: count from trough back to near-peak
  let recovery = 0;
  const troughIdx = curve.findIndex((p) => p.value === troughAt);
  if (troughIdx >= 0) {
    for (let i = troughIdx + 1; i < curve.length; i++) {
      if (curve[i].value >= peakAt * 0.98) break;
      recovery++;
    }
  }

  return {
    maxDrawdown: maxDD * 100,
    peakValue: peakAt,
    troughValue: troughAt,
    recoverySignals: recovery,
  };
}

/* ── Win/Loss streaks ── */

export interface StreakInfo {
  current: { type: "win" | "loss" | "none"; count: number };
  bestWinStreak: number;
  worstLossStreak: number;
  last10: ("win" | "loss" | "pending")[];
}

function computeStreaks(history: RecordedSignal[]): StreakInfo {
  const resolved = history.filter((s) => s.resolved).sort((a, b) => (b.resolved?.resolvedAt ?? 0) - (a.resolved?.resolvedAt ?? 0));

  if (resolved.length === 0) {
    return { current: { type: "none", count: 0 }, bestWinStreak: 0, worstLossStreak: 0, last10: [] };
  }

  // Last 10
  const last10 = resolved.slice(0, 10).map((s) => (s.resolved?.correct ? "win" as const : "loss" as const));

  // Current streak
  const currentType: "win" | "loss" = resolved[0].resolved?.correct ? "win" : "loss";
  let currentCount = 0;
  for (const s of resolved) {
    const isWin = s.resolved?.correct;
    if ((currentType === "win" && isWin) || (currentType === "loss" && !isWin)) {
      currentCount++;
    } else {
      break;
    }
  }

  // Best/worst streaks across all history
  let bestWin = 0;
  let worstLoss = 0;
  let streak = 0;
  let lastResult: boolean | null = null;

  for (const s of [...resolved].reverse()) {
    const correct = s.resolved?.correct ?? false;
    if (correct === lastResult) {
      streak++;
    } else {
      streak = 1;
    }
    if (correct) bestWin = Math.max(bestWin, streak);
    else worstLoss = Math.max(worstLoss, streak);
    lastResult = correct;
  }

  return {
    current: { type: currentType, count: currentCount },
    bestWinStreak: bestWin,
    worstLossStreak: worstLoss,
    last10,
  };
}

/* ── Daily breakdown ── */

export interface DailyBreakdown {
  date: string;
  total: number;
  wins: number;
  losses: number;
  accuracy: number | null;
}

function computeDailyBreakdown(history: RecordedSignal[], days = 7): DailyBreakdown[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const result: DailyBreakdown[] = [];

  for (let i = 0; i < days; i++) {
    const dayStart = now - (i + 1) * dayMs;
    const dayEnd = now - i * dayMs;
    const dateStr = new Date(dayEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const daySignals = history.filter((s) => {
      const ts = s.resolved?.resolvedAt ?? s.timestamp;
      return ts >= dayStart && ts < dayEnd;
    });

    const resolved = daySignals.filter((s) => s.resolved);
    const wins = resolved.filter((s) => s.resolved?.correct).length;
    const losses = resolved.length - wins;

    result.unshift({
      date: dateStr,
      total: daySignals.length,
      wins,
      losses,
      accuracy: resolved.length > 0 ? (wins / resolved.length) * 100 : null,
    });
  }

  return result;
}

/* ── Per-coin breakdown ── */

export interface CoinAccuracy {
  coin: string;
  total: number;
  resolved: number;
  correct: number;
  accuracy: number | null;
}

function computePerCoin(history: RecordedSignal[]): CoinAccuracy[] {
  const byCoin = new Map<string, RecordedSignal[]>();
  for (const s of history) {
    const list = byCoin.get(s.coin) ?? [];
    list.push(s);
    byCoin.set(s.coin, list);
  }

  return Array.from(byCoin.entries()).map(([coin, signals]) => {
    const resolved = signals.filter((s) => s.resolved);
    const correct = resolved.filter((s) => s.resolved?.correct);
    return {
      coin,
      total: signals.length,
      resolved: resolved.length,
      correct: correct.length,
      accuracy: resolved.length > 0 ? (correct.length / resolved.length) * 100 : null,
    };
  }).sort((a, b) => b.total - a.total);
}

/* ── Signal frequency ── */

export interface FrequencyStats {
  signalsPerDay: number;
  mostActivePair: string | null;
  last24h: number;
  last7d: number;
}

function computeFrequency(history: RecordedSignal[]): FrequencyStats {
  if (history.length === 0) return { signalsPerDay: 0, mostActivePair: null, last24h: 0, last7d: 0 };

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const oldest = Math.min(...history.map((s) => s.timestamp));
  const daysSinceFirst = Math.max(1, (now - oldest) / day);

  const last24h = history.filter((s) => now - s.timestamp < day).length;
  const last7d = history.filter((s) => now - s.timestamp < 7 * day).length;

  // Most active pair
  const pairCounts = new Map<string, number>();
  for (const s of history) {
    pairCounts.set(s.pair, (pairCounts.get(s.pair) ?? 0) + 1);
  }
  let mostActive: string | null = null;
  let maxCount = 0;
  for (const [pair, count] of pairCounts) {
    if (count > maxCount) {
      mostActive = pair;
      maxCount = count;
    }
  }

  return {
    signalsPerDay: Math.round((history.length / daysSinceFirst) * 10) / 10,
    mostActivePair: mostActive,
    last24h,
    last7d,
  };
}

/* ── Export CSV ── */

export function exportSignalsCSV(history: RecordedSignal[]): string {
  const header = "Time,Coin,Pair,Action,Confidence,Entry Price,Resolved,Final Price,Correct";
  const rows = history.map((s) => {
    const time = new Date(s.timestamp).toISOString();
    const resolved = s.resolved ? "Yes" : "No";
    const finalPrice = s.resolved?.finalPrice ?? "";
    const correct = s.resolved ? (s.resolved.correct ? "Yes" : "No") : "";
    return `${time},${s.coin},${s.pair},${s.action},${s.confidence},${s.price},${resolved},${finalPrice},${correct}`;
  });
  return [header, ...rows].join("\n");
}

/* ── Main hook ── */

export function useSignalHistory() {
  const [history, setHistory] = useState<RecordedSignal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [resolutionWindow, setResolutionWindow] = useState<ResolutionWindow>("24h");

  useEffect(() => {
    setHistory(load());
    setHydrated(true);
  }, []);

  const recordSignal = useCallback((signal: Signal) => {
    const coin = signal.pair.split("/")[0];
    const entry: RecordedSignal = {
      id: signal.id,
      pair: signal.pair,
      coin,
      action: signal.action,
      confidence: signal.confidence,
      price: signal.price,
      timestamp: Date.now(),
      dimensions: signal.dimensions
        ? {
            etfFlow: signal.dimensions.etfFlow,
            sentiment: signal.dimensions.sentiment,
            macro: signal.dimensions.macro,
            momentum: signal.dimensions.momentum,
            treasury: signal.dimensions.treasury,
          }
        : { etfFlow: 0, sentiment: 0, macro: 0, momentum: 0, treasury: 0 },
      execution: signal.execution,  // store the full plan for accurate correctness evaluation
    };

    setHistory((prev) => {
      const next = [entry, ...prev];
      save(next);
      return next;
    });
  }, []);

  const resolveSignals = useCallback(
    (coin: string, currentPrice: number) => {
      const now = Date.now();
      const windowMs = RESOLUTION_MS[resolutionWindow];
      let changed = false;

      setHistory((prev) => {
        const next = prev.map((s) => {
          // Already resolved or different coin or not enough time passed
          if (s.resolved || s.coin !== coin || now - s.timestamp < windowMs) {
            return s;
          }
          changed = true;
          const correct = isSignalCorrect(s, currentPrice);
          return {
            ...s,
            resolved: { correct, finalPrice: currentPrice, resolvedAt: now },
          };
        });
        if (changed) save(next);
        return next;
      });
    },
    [resolutionWindow],
  );

  // Re-resolve all signals with current price logic
  const reResolveAll = useCallback(
    (currentPrices: Map<string, number>) => {
      const now = Date.now();
      const windowMs = RESOLUTION_MS[resolutionWindow];
      let changed = false;

      setHistory((prev) => {
        const next = prev.map((s) => {
          // Only re-resolve signals that were already resolved
          if (!s.resolved) return s;

          const currentPrice = currentPrices.get(s.coin);
          if (!currentPrice) return s;

          // Check if signal is old enough to resolve
          if (now - s.timestamp < windowMs) return s;

          const correct = isSignalCorrect(s, currentPrice);
          if (correct !== s.resolved.correct) {
            changed = true;
            return {
              ...s,
              resolved: { correct, finalPrice: currentPrice, resolvedAt: now },
            };
          }
          return s;
        });
        if (changed) save(next);
        return next;
      });
    },
    [resolutionWindow],
  );

  // Core stats
  const totalResolved = useMemo(() => history.filter((s) => s.resolved).length, [history]);
  const totalCorrect = useMemo(() => history.filter((s) => s.resolved?.correct).length, [history]);
  const accuracy = totalResolved > 0 ? (totalCorrect / totalResolved) * 100 : null;

  // Enhanced stats
  const calibration = useMemo(() => buildCalibration(history), [history]);
  const equityCurve = useMemo(() => buildEquityCurve(history), [history]);
  const drawdown = useMemo(() => computeMaxDrawdown(equityCurve), [equityCurve]);
  const streaks = useMemo(() => computeStreaks(history), [history]);
  const perCoin = useMemo(() => computePerCoin(history), [history]);
  const frequency = useMemo(() => computeFrequency(history), [history]);
  const dailyBreakdown = useMemo(() => computeDailyBreakdown(history, 7), [history]);

  // Per-coin helper
  const byCoin = useCallback(
    (coin: string) => {
      const resolved = history.filter((s) => s.coin === coin && s.resolved);
      const correct = resolved.filter((s) => s.resolved?.correct).length;
      return {
        total: resolved.length,
        correct,
        accuracy: resolved.length > 0 ? (correct / resolved.length) * 100 : null,
      };
    },
    [history],
  );

  // CSV export
  const exportCSV = useCallback(() => {
    const csv = exportSignalsCSV(history);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalflow-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return {
    history,
    hydrated,
    recordSignal,
    resolveSignals,
    reResolveAll,
    resolutionWindow,
    setResolutionWindow,
    stats: { totalResolved, totalCorrect, accuracy },
    calibration,
    equityCurve,
    drawdown,
    streaks,
    perCoin,
    frequency,
    dailyBreakdown,
    byCoin,
    exportCSV,
  };
}
