"use client";

import type { DashboardMetrics, MetricField, MetricStatus } from "@/lib/hooks/useDashboardMetrics";
import type { TopGainerResult, SignalBreakdown } from "@/lib/api/dashboard-metrics";
import { formatPercent } from "@/lib/api/dashboard-metrics";

interface Props {
  metrics: DashboardMetrics;
}

/* ── Icons ── */
const icons = {
  volume: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  signals: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />
    </svg>
  ),
  confidence: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  gainer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

/* ── Status Badge ── */
function StatusBadge({ status }: { status: MetricStatus }) {
  const styles: Record<MetricStatus, string> = {
    live: "bg-buy-muted text-buy",
    stale: "bg-hold-muted text-hold",
    loading: "bg-[#ffffff06] text-txt-faint animate-pulse",
    error: "bg-sell-muted text-sell",
    demo: "bg-[#ffffff06] text-txt-faint",
  };
  const labels: Record<MetricStatus, string> = {
    live: "LIVE",
    stale: "STALE",
    loading: "...",
    error: "ERROR",
    demo: "DEMO",
  };
  return (
    <span className={`text-[8px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

/* ── Trend Arrow ── */
function TrendArrow({ value, size = 10 }: { value: number; size?: number }) {
  if (value > 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-buy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 7 7 17" /><polyline points="7 7 17 7 17 17" />
      </svg>
    );
  }
  if (value < 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-sell)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7 17 17 7" /><polyline points="17 17 7 17 7 7" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Time ago ── */
function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

/* ── Main ── */
export default function KPICards({ metrics }: Props) {
  const cards = [
    {
      label: "24H Volume",
      icon: "volume" as const,
      accent: "#00ff88",
      value: metrics.volume24h.formatted,
      status: metrics.volume24h.status,
      source: metrics.volume24h.source,
      lastUpdated: metrics.volume24h.lastUpdated,
      sub: metrics.volume24h.status === "live" || metrics.volume24h.status === "stale"
        ? `Across ${metrics.activePairs.value} active pairs`
        : metrics.volume24h.status === "error"
          ? "Market data unavailable"
          : "Waiting for live data",
    },
    {
      label: "Live Signals",
      icon: "signals" as const,
      accent: "#00E5A8",
      value: metrics.activeSignals.formatted,
      status: metrics.activeSignals.status,
      source: metrics.activeSignals.source,
      lastUpdated: metrics.activeSignals.lastUpdated,
      sub: (() => {
        const s = metrics.activeSignals.value;
        if (s.total === 0) return "No active signals";
        return (
          <>
            <span className="text-buy">{s.buy} BUY</span>
            <span className="text-txt-dim mx-0.5">·</span>
            <span className="text-hold">{s.hold} HOLD</span>
            <span className="text-txt-dim mx-0.5">·</span>
            <span className="text-sell">{s.sell} SELL</span>
          </>
        );
      })(),
    },
    {
      label: "Avg Confidence",
      icon: "confidence" as const,
      accent: "#00d4ff",
      value: metrics.avgConfidence.formatted,
      status: metrics.avgConfidence.status,
      source: metrics.avgConfidence.source,
      lastUpdated: metrics.avgConfidence.lastUpdated,
      sub: (() => {
        const s = metrics.activeSignals.value;
        if (s.total === 0) return "No active signals";
        return `High confidence: ${s.highConfidence}`;
      })(),
    },
    {
      label: "Top 24H Gainer",
      icon: "gainer" as const,
      accent: metrics.topGainer.value ? "#00ff88" : "#F59E0B",
      value: metrics.topGainer.value?.pair ?? "—",
      status: metrics.topGainer.status,
      source: metrics.topGainer.source,
      lastUpdated: metrics.topGainer.lastUpdated,
      trend: metrics.topGainer.value ? metrics.topGainer.value.change24h : null,
      sub: (() => {
        const g = metrics.topGainer.value as TopGainerResult | null;
        if (!g) return "Market broadly negative";
        return `${formatPercent(g.change24h)} · $${g.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      })(),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="group relative bg-card border border-border-default rounded-lg overflow-hidden hover:border-border-muted transition-colors"
        >
          {/* Top accent stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, ${c.accent}80, transparent)` }}
          />

          <div className="px-3.5 pt-3 pb-3">
            {/* Row 1: icon + label + status */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span style={{ color: c.accent }} className="opacity-40">
                  {c.icon}
                </span>
                <span className="text-[10px] text-txt-muted uppercase tracking-[0.12em] font-medium">
                  {c.label}
                </span>
              </div>
              <StatusBadge status={c.status} />
            </div>

            {/* Row 2: value + trend */}
            <div className="flex items-end gap-1.5">
              <span
                className="text-xl font-bold font-mono tabular-nums tracking-tight leading-none"
                style={{ color: c.status === "error" ? "var(--color-sell)" : c.accent }}
              >
                {c.status === "loading" ? "..." : c.status === "error" ? "—" : c.value}
              </span>
              {"trend" in c && c.trend !== null && c.trend !== undefined && (
                <span className="mb-0.5">
                  <TrendArrow value={c.trend} size={11} />
                </span>
              )}
            </div>

            {/* Row 3: sub info */}
            <p className="text-[10px] mt-1.5 text-txt-dim leading-tight">
              {c.status === "error" ? c.sub : typeof c.sub === "string" ? c.sub : c.sub}
            </p>

            {/* Row 4: source + freshness */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border-default">
              <span className="text-[8px] text-txt-faint">{c.source}</span>
              {c.lastUpdated && (c.status === "live" || c.status === "stale") && (
                <span className="text-[8px] text-txt-faint">{timeAgo(c.lastUpdated)}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
