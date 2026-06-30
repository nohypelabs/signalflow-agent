"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";

interface Props {
  signal: Signal | null;
}

function actionMeta(signal: Signal): { label: string; color: string; bg: string } {
  if (signal.action === "LONG") return { label: "LONG", color: "text-buy", bg: "bg-buy-muted" };
  if (signal.action === "SHORT") return { label: "SHORT", color: "text-sell", bg: "bg-sell-muted" };
  return { label: "NO TRADE", color: "text-hold", bg: "bg-hold-muted" };
}

function scoreColor(score: number): string {
  if (score >= 65) return "text-buy";
  if (score <= 35) return "text-sell";
  return "text-hold";
}

function scoreIcon(score: number) {
  if (score >= 65) return <TrendingUp size={12} className="text-buy" />;
  if (score <= 35) return <TrendingDown size={12} className="text-sell" />;
  return <Minus size={12} className="text-hold" />;
}

export default function WhyThisSignal({ signal }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!signal) {
    return (
      <Card variant="glass" padding="none" className="overflow-hidden">
        <div className="border-b border-border-default px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Why This Signal?</p>
          <h2 className="mt-1 text-sm font-semibold text-txt-primary">Reasoning breakdown</h2>
        </div>
        <div className="px-4 py-6 flex items-center gap-2">
          <MessageSquare size={14} className="text-txt-muted" />
          <p className="text-[11px] text-txt-secondary">Generate a signal to see full reasoning breakdown.</p>
        </div>
      </Card>
    );
  }

  const meta = actionMeta(signal);
  const factors = signal.factors ?? [];
  const topFactors = [...factors].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50)).slice(0, 5);
  const evidence = signal.setup?.evidence ?? [];
  const thesis = signal.setup?.thesis || signal.reasoning || "No thesis available.";

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <div className="border-b border-border-default px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Why This Signal?</p>
            <h2 className="mt-1 text-sm font-semibold text-txt-primary">Reasoning breakdown</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-[35px] px-2.5 py-1 text-[10px] font-bold ${meta.color} ${meta.bg}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[10px] text-txt-secondary tabular-nums">
              {Math.round(signal.confidence)}% conf
            </span>
          </div>
        </div>
      </div>

      {/* Thesis — always visible */}
      <div className="px-4 py-3 border-b border-border-default/50">
        <div className="flex items-start gap-2">
          <MessageSquare size={14} className="shrink-0 text-accent mt-0.5" />
          <p className="text-[12px] leading-relaxed text-txt-secondary">{thesis}</p>
        </div>
      </div>

      {/* Key Drivers — always visible */}
      <div className="px-4 py-3 border-b border-border-default/50">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">Key Drivers</p>
        <div className="space-y-1.5">
          {topFactors.map((f) => (
            <div key={f.name} className="flex items-center gap-2 text-[11px]">
              {scoreIcon(f.score)}
              <span className="flex-1 text-txt-secondary">{f.name.replaceAll("_", " ")}</span>
              <span className={`font-mono font-bold tabular-nums ${scoreColor(f.score)}`}>
                {Math.round(f.score)}
              </span>
              <div className="w-16 h-1 rounded-full bg-border-default/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.score >= 65 ? "bg-buy" : f.score <= 35 ? "bg-sell" : "bg-hold"}`}
                  style={{ width: `${Math.max(4, Math.min(100, f.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-semibold text-txt-muted transition-colors hover:bg-white/[0.035] hover:text-txt-secondary"
      >
        <span>{expanded ? "Show less" : "Show more details"}</span>
        <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border-default/50">
          {/* Evidence */}
          {evidence.length > 0 && (
            <div className="px-4 py-3 border-b border-border-default/50">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">Evidence</p>
              <div className="space-y-1.5">
                {evidence.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <CheckCircle size={12} className="shrink-0 text-accent mt-0.5" />
                    <span className="text-txt-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regime & Setup */}
          <div className="px-4 py-3 border-b border-border-default/50">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">Context</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="glass-pill px-3 py-2">
                <p className="text-[9px] text-txt-muted">Regime</p>
                <p className="mt-1 text-[11px] font-semibold text-txt-primary">
                  {signal.regime?.replaceAll("_", " ") || "N/A"}
                </p>
              </div>
              <div className="glass-pill px-3 py-2">
                <p className="text-[9px] text-txt-muted">Setup</p>
                <p className="mt-1 text-[11px] font-semibold text-txt-primary">
                  {signal.setup?.label || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* All Factors Detail */}
          {factors.length > 0 && (
            <div className="px-4 py-3 border-b border-border-default/50">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted mb-2">All Factors</p>
              <div className="space-y-1.5">
                {factors.map((f) => (
                  <div key={f.name} className="glass-pill px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-txt-primary">{f.name.replaceAll("_", " ")}</span>
                      <span className={`font-mono text-[10px] font-bold tabular-nums ${scoreColor(f.score)}`}>
                        {Math.round(f.score)}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-txt-secondary">{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
