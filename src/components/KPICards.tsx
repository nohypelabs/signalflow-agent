"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { DashboardMetrics, MetricStatus } from "@/lib/hooks/useDashboardMetrics";
import { formatPercent } from "@/lib/api/dashboard-metrics";

interface Props {
  metrics: DashboardMetrics;
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: MetricStatus }) {
  const styles: Record<MetricStatus, string> = {
    live: "bg-buy-muted text-buy",
    stale: "bg-hold-muted text-hold",
    loading: "bg-[#ffffff10] text-txt-primary animate-pulse",
    error: "bg-sell-muted text-sell",
    demo: "bg-[#ffffff10] text-txt-primary",
  };
  const labels: Record<MetricStatus, string> = {
    live: "LIVE",
    stale: "STALE",
    loading: "...",
    error: "ERROR",
    demo: "DEMO",
  };
  return (
    <span className={`text-[8px] uppercase font-semibold px-1.5 py-0.5 rounded-md ${styles[status]}`}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
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

function metricValue(status: MetricStatus, value: string): string {
  if (status === "loading") return "...";
  if (status === "error") return "-";
  return value;
}

function statusCopy(statuses: MetricStatus[]): string {
  if (statuses.includes("error")) return "Data issue";
  if (statuses.includes("loading")) return "Syncing";
  if (statuses.includes("stale")) return "Stale";
  return "Operational";
}

function sparklinePoints(values: number[], width = 112, height = 30): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function MiniSparkline({
  values,
  tone = "neutral",
}: {
  values: number[];
  tone?: "buy" | "sell" | "neutral";
}) {
  const stroke = tone === "buy"
    ? "var(--color-buy)"
    : tone === "sell"
      ? "var(--color-sell)"
      : "var(--text-secondary)";

  return (
    <svg viewBox="0 0 112 30" className="h-7 w-full" aria-hidden="true">
      <polyline
        points={sparklinePoints(values)}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function MiniKpiCard({
  label,
  value,
  status,
  meta,
  source,
  lastUpdated,
  sparkline,
  tone = "neutral",
  trend,
  valueClassName = "text-txt-primary",
}: {
  label: string;
  value: string;
  status: MetricStatus;
  meta: ReactNode;
  source: string;
  lastUpdated: number | null;
  sparkline: number[];
  tone?: "buy" | "sell" | "neutral";
  trend?: number | null;
  valueClassName?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1.5, transition: { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] } }}
      className="min-w-0 h-full bg-card border border-border-default rounded-lg px-3.5 py-3 transition-[background-color,border-color,transform] duration-200 hover:bg-elevated/10 hover:border-border-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase font-semibold text-txt-primary truncate">
          {label}
        </span>
        <StatusBadge status={status} />
      </div>
      <div className="mt-2 flex items-end gap-1.5 min-w-0">
        <span className={`text-[18px] md:text-[20px] font-semibold font-mono tabular-nums leading-none truncate ${status === "error" ? "text-sell" : valueClassName}`}>
          {metricValue(status, value)}
        </span>
        {trend !== null && trend !== undefined && (
          <span className="mb-0.5 shrink-0">
            <TrendArrow value={trend} size={11} />
          </span>
        )}
      </div>
      <div className="mt-2 text-[10px] text-txt-secondary leading-[1.35] min-h-[27px]">
        {meta}
      </div>
      <div className="mt-2">
        <MiniSparkline values={sparkline} tone={tone} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[8px] text-txt-secondary">
        <span className="truncate">{source}</span>
        {lastUpdated && (status === "live" || status === "stale") && (
          <span className="shrink-0">{timeAgo(lastUpdated)}</span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main ── */
export default function KPICards({ metrics }: Props) {
  const signals = metrics.activeSignals.value;
  const topGainer = metrics.topGainer.value;
  const statuses = [
    metrics.avgConfidence.status,
    metrics.activeSignals.status,
    metrics.volume24h.status,
    metrics.topGainer.status,
  ];
  const newestUpdate = Math.max(
    ...[
      metrics.avgConfidence.lastUpdated,
      metrics.activeSignals.lastUpdated,
      metrics.volume24h.lastUpdated,
      metrics.topGainer.lastUpdated,
    ].filter((ts): ts is number => typeof ts === "number")
  );
  const signalQualityMeta = signals.total > 0
    ? `${signals.highConfidence} high confidence / ${signals.total} active`
    : "Waiting for qualified signal flow";
  const topMoverChange = topGainer?.change24h ?? 0;
  const signalSpark = [
    Math.max(0, signals.sell),
    Math.max(0, signals.hold),
    Math.max(0, signals.buy),
    Math.max(0, signals.total),
    Math.max(0, signals.highConfidence),
  ];
  const volumeBase = Math.max(1, metrics.activePairs.value);
  const volumeSpark = [
    volumeBase * 0.62,
    volumeBase * 0.88,
    volumeBase * 0.76,
    volumeBase,
    volumeBase * 0.94,
  ];
  const moverSpark = [
    0,
    topMoverChange * 0.24,
    topMoverChange * 0.52,
    topMoverChange * 0.38,
    topMoverChange,
  ];
  const freshnessSpark = [
    metrics.activePairs.value,
    metrics.activeSignals.value.total,
    metrics.volume24h.value > 0 ? 1 : 0,
    metrics.avgConfidence.value,
    Number.isFinite(newestUpdate) ? 100 : 0,
  ];

  return (
    <section className="bg-card border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-txt-secondary">Flow Summary</p>
          <h2 className="mt-0.5 text-sm font-semibold text-txt-primary">Signal quality, activity, market breadth, and freshness</h2>
        </div>
        <span className="hidden sm:inline text-[10px] font-semibold text-txt-primary">
          {statusCopy(statuses)}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.9fr] gap-2.5 p-3">
      <motion.div
        whileHover={{ y: -1.5, transition: { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] } }}
        className="bg-inset/30 border border-border-default rounded-lg overflow-hidden transition-[background-color,border-color,transform] duration-200 hover:bg-elevated/10 hover:border-border-muted"
      >
        <div className="px-4 py-4 md:px-5 md:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase font-semibold text-txt-secondary">Priority Signal</p>
              <h2 className="mt-1 text-[15px] font-semibold text-txt-primary">Signal Quality</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${
                statuses.includes("error")
                  ? "bg-sell"
                  : statuses.includes("loading") || statuses.includes("stale")
                    ? "bg-hold"
                    : "bg-buy"
              }`} />
              <StatusBadge status={metrics.avgConfidence.status} />
            </div>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className={`text-[40px] md:text-[48px] font-semibold font-mono tabular-nums leading-none ${
              metrics.avgConfidence.status === "error" ? "text-sell" : "text-txt-primary"
            }`}>
              {metricValue(metrics.avgConfidence.status, metrics.avgConfidence.formatted)}
            </span>
            <span className="mb-1.5 text-[10px] uppercase text-txt-primary">weighted confidence</span>
          </div>

          <p className="mt-2 text-[11px] text-txt-primary leading-relaxed">{signalQualityMeta}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-inset/40 px-2.5 py-2">
              <p className="text-[8px] uppercase text-txt-primary">Long</p>
              <p className="mt-1 text-sm font-semibold font-mono text-buy tabular-nums">{signals.buy}</p>
            </div>
            <div className="rounded-md bg-inset/40 px-2.5 py-2">
              <p className="text-[8px] uppercase text-txt-primary">No Trade</p>
              <p className="mt-1 text-sm font-semibold font-mono text-hold tabular-nums">{signals.hold}</p>
            </div>
            <div className="rounded-md bg-inset/40 px-2.5 py-2">
              <p className="text-[8px] uppercase text-txt-primary">Short</p>
              <p className="mt-1 text-sm font-semibold font-mono text-sell tabular-nums">{signals.sell}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[9px] uppercase text-txt-primary">
            <span>{statusCopy(statuses)}</span>
            {Number.isFinite(newestUpdate) && <span>Updated {timeAgo(newestUpdate)}</span>}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 h-full">
        <MiniKpiCard
          label="Live Signals"
          value={metrics.activeSignals.formatted}
          status={metrics.activeSignals.status}
          source={metrics.activeSignals.source}
          lastUpdated={metrics.activeSignals.lastUpdated}
          sparkline={signalSpark}
          tone={signals.buy >= signals.sell ? "buy" : "sell"}
          valueClassName="text-txt-primary"
          meta={signals.total === 0 ? "No active signals" : `${signals.highConfidence} high confidence`}
        />
        <MiniKpiCard
          label="Top Mover"
          value={topGainer?.pair ?? "-"}
          status={metrics.topGainer.status}
          source={metrics.topGainer.source}
          lastUpdated={metrics.topGainer.lastUpdated}
          sparkline={moverSpark}
          tone={topMoverChange >= 0 ? "buy" : "sell"}
          trend={topGainer ? topGainer.change24h : null}
          valueClassName="text-txt-primary"
          meta={topGainer ? (
            <>
              <span className={topGainer.change24h >= 0 ? "text-buy font-semibold" : "text-sell font-semibold"}>
                {formatPercent(topGainer.change24h)}
              </span>
              <span className="text-txt-primary mx-1">/</span>
              <span className="text-txt-secondary font-medium">${formatTopPrice(topGainer.price)}</span>
            </>
          ) : "No positive mover yet"}
        />
        <MiniKpiCard
          label="Market Breadth"
          value={metrics.volume24h.formatted}
          status={metrics.volume24h.status}
          source={metrics.volume24h.source}
          lastUpdated={metrics.volume24h.lastUpdated}
          sparkline={volumeSpark}
          tone="neutral"
          valueClassName="text-txt-primary"
          meta={metrics.volume24h.status === "error"
            ? "Market data unavailable"
            : `Across ${metrics.activePairs.value} active pairs`}
        />
        <MiniKpiCard
          label="Data Freshness"
          value={Number.isFinite(newestUpdate) ? timeAgo(newestUpdate) : "-"}
          status={statuses.includes("error") ? "error" : statuses.includes("loading") ? "loading" : statuses.includes("stale") ? "stale" : "live"}
          source="SignalFlow monitor"
          lastUpdated={Number.isFinite(newestUpdate) ? newestUpdate : null}
          sparkline={freshnessSpark}
          tone={statuses.includes("error") ? "sell" : statuses.includes("stale") ? "neutral" : "buy"}
          valueClassName="text-txt-primary"
          meta={statuses.includes("error") ? "One or more feeds need attention" : statuses.includes("stale") ? "Refresh lag detected" : "All visible feeds are current"}
        />
      </div>
      </div>
    </section>
  );
}
