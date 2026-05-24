"use client";

import { useState, useEffect, useCallback } from "react";
import type { Signal } from "./mock-data";

export interface RecordedSignal {
  id: string;
  pair: string;
  coin: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  timestamp: number;
  dimensions: {
    etfFlow: number;
    sentiment: number;
    macro: number;
    momentum: number;
    treasury: number;
  };
  resolved?: {
    correct: boolean;
    finalPrice: number;
    resolvedAt: number;
  };
}

const STORAGE_KEY = "signalflow_signal_history";
const RESOLVE_AFTER_MS = 60 * 60 * 1000; // 1 hour before resolving

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-500)));
  } catch {
    // storage full — oldest signals get trimmed
  }
}

export function useSignalHistory() {
  const [history, setHistory] = useState<RecordedSignal[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
      let changed = false;

      setHistory((prev) => {
        const next = prev.map((s) => {
          if (s.resolved || s.coin !== coin || now - s.timestamp < RESOLVE_AFTER_MS) {
            return s;
          }
          changed = true;
          let correct = false;
          if (s.action === "BUY") {
            correct = currentPrice > s.price;
          } else if (s.action === "SELL") {
            correct = currentPrice < s.price;
          } else {
            correct = Math.abs(currentPrice - s.price) / s.price <= 0.02;
          }
          return {
            ...s,
            resolved: { correct, finalPrice: currentPrice, resolvedAt: now },
          };
        });
        if (changed) save(next);
        return next;
      });
    },
    [],
  );

  const totalResolved = history.filter((s) => s.resolved).length;
  const totalCorrect = history.filter((s) => s.resolved?.correct).length;
  const accuracy = totalResolved > 0 ? (totalCorrect / totalResolved) * 100 : null;

  const byCoin = (coin: string) => {
    const resolved = history.filter((s) => s.coin === coin && s.resolved);
    const correct = resolved.filter((s) => s.resolved?.correct).length;
    return {
      total: resolved.length,
      correct,
      accuracy: resolved.length > 0 ? (correct / resolved.length) * 100 : null,
    };
  };

  return {
    history,
    hydrated,
    recordSignal,
    resolveSignals,
    stats: { totalResolved, totalCorrect, accuracy },
    byCoin,
  };
}
