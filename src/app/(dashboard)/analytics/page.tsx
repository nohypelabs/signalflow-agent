"use client";

import { useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function AnalyticsRoute() {
  const d = useDashboard();
  const paper = usePaperTrading(d.isConnected ? d.address : undefined);

  // Convert klines to benchmark format (BTC price over time)
  const benchmarkKlines = useMemo(() => {
    if (!d.klines) return undefined;
    return d.klines.map((k) => ({
      time: k.t,
      close: parseFloat(k.c),
    }));
  }, [d.klines]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <AnalyticsDashboard
        trades={paper.trades}
        initialBalance={paper.balance?.initialBalance ?? 10000}
        benchmarkKlines={benchmarkKlines}
      />
    </div>
  );
}
