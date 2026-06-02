"use client";

import { useMemo } from "react";
import { useScreener } from "@/lib/hooks/useScreener";
import MarketOverviewPage from "@/components/MarketOverviewPage";
import ScreenerTable from "@/components/ScreenerTable";
import CorrelationMatrix from "@/components/CorrelationMatrix";
import SignalHistoryPage from "@/components/SignalHistoryPage";
import { TrendingUp, TrendingDown, BarChart3, Layers } from "lucide-react";

function fmtVol(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function ScreenerStats() {
  const { data, total, loading } = useScreener();

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalVol = data.reduce((s, p) => s + p.quoteVolume24h, 0);
    const avgChange = data.reduce((s, p) => s + p.change24h, 0) / data.length;
    const topGainer = [...data].sort((a, b) => b.change24h - a.change24h)[0];
    const topLoser = [...data].sort((a, b) => a.change24h - b.change24h)[0];
    const trading = data.filter((p) => p.status === "TRADING").length;

    return { totalVol, avgChange, topGainer, topLoser, trading };
  }, [data]);

  if (loading || !stats) {
    return (
      <section className="rounded-xl border border-border-default bg-inset/70 p-4 animate-pulse">
        <div className="h-20" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-default bg-inset/70 p-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1.4fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-secondary">24H Volume</p>
          <div className="mt-1.5 flex items-end gap-3">
            <div className="font-mono text-5xl font-bold leading-none tracking-tight text-accent">
              {fmtVol(stats.totalVol)}
            </div>
            <div className="pb-1">
              <div className="text-sm font-semibold text-txt-primary">{total} pairs</div>
              <div className="text-[11px] text-txt-tertiary">
                {stats.trading} active / {total - stats.trading} halted
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Top Gainer",
              value: `+${stats.topGainer.change24h.toFixed(2)}%`,
              sub: stats.topGainer.baseCoin,
              tone: "text-buy",
              icon: <TrendingUp size={12} className="text-buy" />,
            },
            {
              label: "Top Loser",
              value: `${stats.topLoser.change24h.toFixed(2)}%`,
              sub: stats.topLoser.baseCoin,
              tone: "text-sell",
              icon: <TrendingDown size={12} className="text-sell" />,
            },
            {
              label: "Avg Change",
              value: `${stats.avgChange >= 0 ? "+" : ""}${stats.avgChange.toFixed(2)}%`,
              sub: "24h avg",
              tone: stats.avgChange >= 0 ? "text-buy" : "text-sell",
              icon: <BarChart3 size={12} className="text-txt-muted" />,
            },
            {
              label: "Active Pairs",
              value: `${stats.trading}`,
              sub: `of ${total} total`,
              tone: "text-info",
              icon: <Layers size={12} className="text-info" />,
            },
          ].map((item) => (
            <div key={item.label} className="border-l border-border-default px-3">
              <div className="flex items-center gap-1.5">
                {item.icon}
                <div className="text-[9px] font-semibold uppercase tracking-wider text-txt-faint">{item.label}</div>
              </div>
              <div className={`mt-1.5 font-mono text-base font-bold ${item.tone}`}>{item.value}</div>
              <div className="text-[10px] text-txt-tertiary mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScreenerTab() {
  return (
    <>
      <ScreenerStats />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <CorrelationMatrix />
        <ScreenerTable />
      </div>
    </>
  );
}

export default function ScreenerPage() {
  return (
    <MarketOverviewPage>
      {(tab) => (tab === "screener" ? <ScreenerTab /> : <SignalHistoryPage />)}
    </MarketOverviewPage>
  );
}
