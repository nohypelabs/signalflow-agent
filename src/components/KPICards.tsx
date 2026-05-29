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

function Cell({
  label,
  value,
  status,
  meta,
  source,
  lastUpdated,
  trend,
  valueClassName = "text-txt-primary",
}: {
  label: string;
  value: string;
  status: MetricStatus;
  meta: ReactNode;
  source: string;
  lastUpdated: number | null;
  trend?: number | null;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 px-3.5 py-3 md:px-4 md:py-3.5 border-t md:border-t-0 md:border-l border-border-default">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase font-semibold text-txt-faint truncate">
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
      <div className="mt-2 text-[10px] text-txt-dim leading-[1.35] min-h-[27px]">
        {meta}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[8px] text-txt-faint">
        <span className="truncate">{source}</span>
        {lastUpdated && (status === "live" || status === "stale") && (
          <span className="shrink-0">{timeAgo(lastUpdated)}</span>
        )}
      </div>
    </div>
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

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] } }}
      className="bg-card border border-border-default rounded-lg overflow-hidden transition-[background-color,border-color,transform] duration-200 hover:bg-elevated/10 hover:border-border-muted"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.18fr_2.35fr]">
        <div className="px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase font-semibold text-txt-faint">
                SignalFlow Command Center
              </p>
              <h2 className="mt-1 text-[13px] font-semibold text-txt-secondary">
                Signal Quality
              </h2>
            </div>
            <StatusBadge status={metrics.avgConfidence.status} />
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className={`text-[34px] md:text-[38px] font-semibold font-mono tabular-nums leading-none ${
              metrics.avgConfidence.status === "error" ? "text-sell" : "text-txt-primary"
            }`}>
              {metricValue(metrics.avgConfidence.status, metrics.avgConfidence.formatted)}
            </span>
            <span className="mb-1 text-[10px] uppercase text-txt-faint">
              weighted
            </span>
          </div>

          <p className="mt-2 text-[11px] text-txt-dim leading-relaxed">
            {signalQualityMeta}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 border-t md:border-t-0 border-border-default">
          <Cell
            label="Live Signals"
            value={metrics.activeSignals.formatted}
            status={metrics.activeSignals.status}
            source={metrics.activeSignals.source}
            lastUpdated={metrics.activeSignals.lastUpdated}
            valueClassName="text-txt-primary"
            meta={signals.total === 0 ? (
              "No active signals"
            ) : (
              <>
                <span className="text-buy">{signals.buy} LONG</span>
                <span className="text-txt-dim mx-1">/</span>
                <span className="text-hold">{signals.hold} NO TRADE</span>
                <span className="text-txt-dim mx-1">/</span>
                <span className="text-sell">{signals.sell} SHORT</span>
              </>
            )}
          />
          <Cell
            label="24H Volume"
            value={metrics.volume24h.formatted}
            status={metrics.volume24h.status}
            source={metrics.volume24h.source}
            lastUpdated={metrics.volume24h.lastUpdated}
            valueClassName="text-txt-primary"
            meta={metrics.volume24h.status === "error"
              ? "Market data unavailable"
              : `Across ${metrics.activePairs.value} active pairs`}
          />
          <Cell
            label="Top Mover"
            value={topGainer?.pair ?? "-"}
            status={metrics.topGainer.status}
            source={metrics.topGainer.source}
            lastUpdated={metrics.topGainer.lastUpdated}
            trend={topGainer ? topGainer.change24h : null}
            valueClassName="text-txt-primary"
            meta={topGainer ? (
              <>
                <span className={topGainer.change24h >= 0 ? "text-buy font-semibold" : "text-sell font-semibold"}>
                  {formatPercent(topGainer.change24h)}
                </span>
                <span className="text-txt-dim mx-1">/</span>
                <span className="text-txt-secondary font-medium">${formatTopPrice(topGainer.price)}</span>
              </>
            ) : (
              "No positive mover yet"
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-default px-4 py-2 text-[9px] uppercase text-txt-faint">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            statuses.includes("error")
              ? "bg-sell"
              : statuses.includes("loading") || statuses.includes("stale")
                ? "bg-hold"
                : "bg-buy"
          }`} />
          <span>{statusCopy(statuses)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{metrics.volume24h.source}</span>
          {Number.isFinite(newestUpdate) && (
            <>
              <span className="text-txt-dim">/</span>
              <span>Updated {timeAgo(newestUpdate)}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
