"use client";

import { motion } from "framer-motion";
import type { DashboardMetrics, MetricStatus } from "@/lib/hooks/useDashboardMetrics";
import type { TopGainerResult } from "@/lib/api/dashboard-metrics";
import { formatPercent } from "@/lib/api/dashboard-metrics";

interface Props {
  metrics: DashboardMetrics;
}

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
    <span className={`text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md ${styles[status]}`}>
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

function formatTopPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
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
        return (
          <>
            <span className={g.change24h >= 0 ? "text-buy font-semibold" : "text-sell font-semibold"}>
              {formatPercent(g.change24h)}
            </span>
            <span className="text-txt-dim mx-0.5">·</span>
            <span className="text-txt-secondary font-medium">
              ${formatTopPrice(g.price)}
            </span>
          </>
        );
      })(),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {cards.map((c) => (
        <motion.div
          key={c.label}
          whileHover={{ y: -1.5, transition: { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] } }}
          className="group relative bg-card border border-border-default rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.34),0_8px_20px_rgba(0,0,0,0.2)] overflow-hidden hover:border-border-strong hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.38),0_12px_26px_rgba(0,0,0,0.26)] transition-[border-color,box-shadow,transform] duration-200"
        >
          {/* Top accent stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(90deg, ${c.accent}80, transparent)` }}
          />

          <div className="px-3.5 md:px-4 pt-3 pb-3.5">
            {/* Row 1: icon + label + status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center text-[10px] text-txt-muted uppercase tracking-[0.1em] font-medium"
                  style={{ color: c.accent }}
                >
                  {c.label}
                </span>
              </div>
              <StatusBadge status={c.status} />
            </div>

            {/* Row 2: value + trend */}
            <div className="flex items-end gap-1.5 min-h-[28px]">
              <span
                className="text-[19px] md:text-[21px] font-semibold font-mono tabular-nums leading-none"
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
            <p className="text-[10px] mt-2 text-txt-dim leading-[1.35] min-h-[27px]">
              {c.status === "error" ? c.sub : typeof c.sub === "string" ? c.sub : c.sub}
            </p>

            {/* Row 4: source + freshness */}
            <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border-default">
              <span className="text-[8px] text-txt-faint tracking-wide">{c.source}</span>
              {c.lastUpdated && (c.status === "live" || c.status === "stale") && (
                <span className="text-[8px] text-txt-faint tracking-wide">{timeAgo(c.lastUpdated)}</span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
