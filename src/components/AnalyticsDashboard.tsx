"use client";

import { useMemo } from "react";
import { BarChartIcon } from "@/components/ui/icons";
import {
  computeAnalytics,
  equityCurve,
  drawdownSeries,
} from "@/lib/utils/analytics";
import type { PaperTrade } from "@/lib/utils/analytics";
import EquityCurve from "./EquityCurve";
import DrawdownChart from "./DrawdownChart";
import RiskMetrics from "./RiskMetrics";

interface Props {
  trades: PaperTrade[];
  initialBalance: number;
  benchmarkKlines?: { time: number; close: number }[];
}

export default function AnalyticsDashboard({
  trades,
  initialBalance,
  benchmarkKlines,
}: Props) {
  const analytics = useMemo(
    () => computeAnalytics(trades, initialBalance),
    [trades, initialBalance],
  );

  const eqCurve = useMemo(
    () => equityCurve(trades, initialBalance),
    [trades, initialBalance],
  );

  const ddSeries = useMemo(
    () => drawdownSeries(trades, initialBalance),
    [trades, initialBalance],
  );

  const closedTrades = trades.filter(
    (t) => t.status !== "OPEN" && t.pnl !== undefined,
  );

  // Convert benchmark klines to equity curve format
  const benchmarkCurve = useMemo(() => {
    if (!benchmarkKlines || benchmarkKlines.length < 2) return undefined;
    return benchmarkKlines.map((k) => ({ date: k.time, value: k.close }));
  }, [benchmarkKlines]);

  if (closedTrades.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <BarChartIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-txt-primary">Analytics</h2>
            <p className="text-xs text-txt-muted">
              Advanced portfolio performance metrics
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-card py-20">
          <BarChartIcon size={32} className="text-txt-faint mb-3" />
          <p className="text-sm font-medium text-txt-muted">No closed trades yet</p>
          <p className="text-xs text-txt-faint mt-1">
            Close some trades to see analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <BarChartIcon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-txt-primary">Analytics</h2>
          <p className="text-xs text-txt-muted">
            {closedTrades.length} closed trades · Initial capital ${initialBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Risk metrics grid */}
      <RiskMetrics analytics={analytics} />

      {/* Equity Curve */}
      <div className="rounded-xl border border-border-default bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">
          Equity Curve
        </p>
        <EquityCurve
          data={eqCurve}
          benchmark={benchmarkCurve}
          benchmarkLabel="BTC"
          height={240}
        />
      </div>

      {/* Drawdown Chart */}
      <div className="rounded-xl border border-border-default bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">
          Drawdown
        </p>
        <DrawdownChart data={ddSeries} height={180} />
      </div>
    </div>
  );
}
