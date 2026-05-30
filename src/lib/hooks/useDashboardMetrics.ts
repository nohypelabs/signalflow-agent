"use client";

import { useMemo } from "react";
import type { SoDEXTicker } from "../types/trade";
import type { Signal } from "../types/signal";
import {
  compute24hVolume,
  computeActivePairs,
  computeSignalBreakdown,
  computeTopGainer,
  computeTopLoser,
  formatUsd,
  isFresh,
  logKPI,
} from "../api/dashboard-metrics";

export type MetricStatus = "live" | "stale" | "loading" | "error" | "demo";

export interface MetricField<T> {
  value: T;
  formatted: string;
  source: string;
  lastUpdated: number | null;
  status: MetricStatus;
}

export interface DashboardMetrics {
  volume24h: MetricField<number>;
  activePairs: MetricField<number>;
  activeSignals: MetricField<import("../api/dashboard-metrics").SignalBreakdown>;
  topGainer: MetricField<import("../api/dashboard-metrics").TopGainerResult | null>;
  topLoser: MetricField<import("../api/dashboard-metrics").TopGainerResult | null>;
  avgConfidence: MetricField<number>;
}

const STALE_MS = 60_000; // 60s for live data

function getStatus(computedAt: number, hasData: boolean, hasError: boolean): MetricStatus {
  if (hasError) return "error";
  if (!hasData) return "loading";
  if (!isFresh(computedAt, STALE_MS)) return "stale";
  return "live";
}

export function useDashboardMetrics(
  tickers: SoDEXTicker[] | null | undefined,
  signals: Signal[] | null | undefined,
  marketError: string | null,
  signalsError: string | null,
): DashboardMetrics {
  return useMemo(() => {
    const vol = compute24hVolume(tickers ?? null);
    const pairs = computeActivePairs(tickers ?? null);
    const sigs = computeSignalBreakdown(signals);
    const gainer = computeTopGainer(tickers ?? null);
    const loser = computeTopLoser(tickers ?? null);

    logKPI("24H Volume", vol);
    logKPI("Active Pairs", pairs);
    logKPI("Signal Breakdown", sigs, `avg=${sigs.value.avgConfidence.toFixed(1)}%`);
    logKPI("Top Gainer", gainer);
    logKPI("Top Loser", loser);

    const hasTickers = !!tickers && tickers.length > 0;
    const hasSignals = !!signals && signals.length > 0;

    return {
      volume24h: {
        value: vol.value,
        formatted: formatUsd(vol.value),
        source: vol.source,
        lastUpdated: vol.computedAt,
        status: getStatus(vol.computedAt, hasTickers, !!marketError),
      },
      activePairs: {
        value: pairs.value,
        formatted: String(pairs.value),
        source: pairs.source,
        lastUpdated: pairs.computedAt,
        status: getStatus(pairs.computedAt, hasTickers, !!marketError),
      },
      activeSignals: {
        value: sigs.value,
        formatted: String(sigs.value.total),
        source: sigs.source,
        lastUpdated: sigs.computedAt,
        status: getStatus(sigs.computedAt, hasSignals, !!signalsError),
      },
      topGainer: {
        value: gainer.value,
        formatted: gainer.value ? gainer.value.pair : "—",
        source: gainer.source,
        lastUpdated: gainer.computedAt,
        status: getStatus(gainer.computedAt, hasTickers, !!marketError),
      },
      topLoser: {
        value: loser.value,
        formatted: loser.value ? loser.value.pair : "—",
        source: loser.source,
        lastUpdated: loser.computedAt,
        status: getStatus(loser.computedAt, hasTickers, !!marketError),
      },
      avgConfidence: {
        value: sigs.value.avgConfidence,
        formatted: hasSignals
          ? sigs.value.avgConfidence > 0
            ? `${sigs.value.avgConfidence.toFixed(1)}%`
            : "—"
          : "—",
        source: sigs.source,
        lastUpdated: sigs.computedAt,
        status: getStatus(sigs.computedAt, hasSignals, !!signalsError),
      },
    };
  }, [tickers, signals, marketError, signalsError]);
}
