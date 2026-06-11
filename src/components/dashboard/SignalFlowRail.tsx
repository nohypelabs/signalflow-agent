"use client";

import Link from "next/link";
import type { Signal } from "@/lib/types/signal";
import type { DashboardMetrics, MetricStatus } from "@/lib/hooks/useDashboardMetrics";

type RailStatus = "live" | "loading" | "degraded" | "error" | "idle" | "ready";

interface Props {
  sodexStatus: "connected" | "error" | "loading";
  marketError: string | null;
  signalsError: string | null;
  metrics: DashboardMetrics;
  includeAI: boolean;
  aiProviderLabel: string;
  analyzing: boolean;
  displaySignal: Signal | null;
}

function metricToRailStatus(status: MetricStatus): RailStatus {
  if (status === "live") return "live";
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  if (status === "stale") return "degraded";
  return "idle";
}

function statusClass(status: RailStatus): string {
  if (status === "live" || status === "ready") return "bg-buy-muted text-buy border-buy-dim";
  if (status === "loading") return "bg-hold-muted text-hold border-hold-dim";
  if (status === "degraded") return "bg-hold-muted text-hold border-hold-dim";
  if (status === "error") return "bg-sell-muted text-sell border-sell-dim";
  return "bg-[#ffffff10] text-txt-primary border-border-default";
}

function dotClass(status: RailStatus): string {
  if (status === "live" || status === "ready") return "bg-buy";
  if (status === "loading" || status === "degraded") return "bg-hold";
  if (status === "error") return "bg-sell";
  return "bg-txt-secondary";
}

function statusLabel(status: RailStatus): string {
  if (status === "live") return "LIVE";
  if (status === "ready") return "READY";
  if (status === "loading") return "SYNC";
  if (status === "degraded") return "STALE";
  if (status === "error") return "ERROR";
  return "IDLE";
}

function displayAction(signal: Signal | null): string {
  if (!signal) return "Waiting";
  if (signal.action === "HOLD") return "No Trade";
  return signal.action;
}

export default function SignalFlowRail({
  sodexStatus,
  marketError,
  signalsError,
  metrics,
  includeAI,
  aiProviderLabel,
  analyzing,
  displaySignal,
}: Props) {
  const nodes = [
    {
      label: "SoDEX Data",
      detail: sodexStatus === "connected" ? `${metrics.activePairs.value} markets` : "Market feed",
      status: marketError ? "error" as RailStatus : sodexStatus === "connected" ? "live" as RailStatus : "loading" as RailStatus,
    },
    {
      label: "SoSoValue Data",
      detail: signalsError ? "Signal inputs degraded" : "ETF, macro, sentiment",
      status: signalsError ? "error" as RailStatus : metricToRailStatus(metrics.activeSignals.status),
    },
    {
      label: "Confluence V3",
      detail: metrics.avgConfidence.status === "live" ? `${metrics.avgConfidence.formatted} confidence` : "Scoring engine",
      status: metricToRailStatus(metrics.avgConfidence.status),
      href: "/docs#confluence-v3",
    },
    {
      label: "AI Thesis",
      detail: includeAI ? aiProviderLabel : "Technical only",
      status: analyzing ? "loading" as RailStatus : includeAI ? "ready" as RailStatus : "idle" as RailStatus,
    },
    {
      label: "Trade Setup",
      detail: displayAction(displaySignal),
      status: displaySignal ? "ready" as RailStatus : "idle" as RailStatus,
    },
  ];

  return (
    <section className="bg-card border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-txt-secondary font-semibold">SignalFlow Pipeline</p>
          <h1 className="mt-0.5 text-sm md:text-base font-semibold text-txt-primary">Market data into executable signal decisions</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] text-txt-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
          <span>{metrics.activeSignals.value.total} active signals</span>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {nodes.map((node, index) => (
            <div key={node.label} className="relative min-w-0">
              {index < nodes.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[calc(100%-0.35rem)] w-[0.7rem] h-px bg-border-default" />
              )}
              <div className="h-full rounded-lg border border-border-default bg-inset/30 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-txt-secondary truncate">
                    {node.href ? (
                      <Link
                        href={node.href}
                        className="transition-colors hover:text-accent hover:underline underline-offset-4"
                      >
                        {node.label}
                      </Link>
                    ) : (
                      node.label
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-bold ${statusClass(node.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass(node.status)} ${node.status === "live" || node.status === "loading" ? "animate-pulse" : ""}`} />
                    {statusLabel(node.status)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-txt-primary truncate">{node.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
