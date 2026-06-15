"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Signal, ConfluenceFactor } from "@/lib/types/signal";
import Card from "@/components/ui/Card";

interface Props {
  signal: Signal | null;
  sourceFlags?: Record<string, boolean | number>;
}

interface LayerItem {
  id: string;
  label: string;
  score: number;
  weight: number;
  subItems: { label: string; score: number }[];
}

function buildLayers(signal: Signal | null, sourceFlags?: Record<string, boolean | number>): LayerItem[] {
  const factors = signal?.factors ?? [];

  const confluenceSubs: { label: string; score: number }[] = factors.length > 0
    ? factors.map((f: ConfluenceFactor) => ({
        label: f.name.replaceAll("_", " "),
        score: Math.round(f.score),
      }))
    : [
        { label: "RSI divergence", score: 0 },
        { label: "Volume spike", score: 0 },
        { label: "Funding rate", score: 0 },
      ];

  const sentimentDetail = signal?.dimensionDetails?.sentiment?.detail;
  const newsSubs = sentimentDetail
    ? [{ label: sentimentDetail, score: Math.round(signal?.dimensions?.sentiment ?? 50) }]
    : [{ label: "Waiting for headlines", score: 0 }];

  const etfDetail = signal?.dimensionDetails?.etfFlow?.detail;
  const macroDetail = signal?.dimensionDetails?.macro?.detail;
  const treasuryDetail = signal?.dimensionDetails?.treasury?.detail;

  return [
    {
      id: "confluence",
      label: "Core Confluence (TA + Micro)",
      score: signal ? Math.round(signal.confluence ?? signal.confidence) : 0,
      weight: 1.0,
      subItems: confluenceSubs,
    },
    {
      id: "news",
      label: "News Sentiment",
      score: Math.round(signal?.dimensions?.sentiment ?? 0),
      weight: 0.2,
      subItems: newsSubs,
    },
    {
      id: "etf",
      label: "ETF Flow",
      score: Math.round(signal?.dimensions?.etfFlow ?? 0),
      weight: sourceFlags?.etf ? 0.15 : 0,
      subItems: etfDetail ? [{ label: etfDetail, score: Math.round(signal?.dimensions?.etfFlow ?? 50) }] : [{ label: "Source unavailable", score: 0 }],
    },
    {
      id: "macro",
      label: "Macro Context",
      score: Math.round(signal?.dimensions?.macro ?? 0),
      weight: sourceFlags?.macro ? 0.1 : 0,
      subItems: macroDetail ? [{ label: macroDetail, score: Math.round(signal?.dimensions?.macro ?? 50) }] : [{ label: "Source unavailable", score: 0 }],
    },
    {
      id: "ai",
      label: "AI Thesis",
      score: signal?.frameworkApplication ? 8 : 0,
      weight: signal?.frameworkApplication ? 0.1 : 0,
      subItems: signal?.frameworkApplication
        ? signal.frameworkApplication.principlesApplied.slice(0, 3).map((p) => ({ label: p, score: 8 }))
        : [{ label: "Not applied", score: 0 }],
    },
    {
      id: "treasury",
      label: "Treasury Data",
      score: Math.round(signal?.dimensions?.treasury ?? 0),
      weight: sourceFlags?.treasuries ? 0.05 : 0,
      subItems: treasuryDetail ? [{ label: treasuryDetail, score: Math.round(signal?.dimensions?.treasury ?? 50) }] : [{ label: "Source unavailable", score: 0 }],
    },
  ];
}

function scoreBarColor(score: number): string {
  if (score >= 65) return "bg-buy";
  if (score <= 35) return "bg-sell";
  return "bg-hold";
}

export default function LayerBreakdown({ signal, sourceFlags }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const layers = buildLayers(signal, sourceFlags);

  function toggleLayer(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card variant="glass" padding="none" className="overflow-hidden rounded-xl">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Layer Breakdown</p>
        <h2 className="mt-1 text-sm font-semibold text-txt-primary">Pipeline score contributions</h2>
      </div>

      <div className="divide-y divide-border-default">
        {layers.map((layer) => {
          const isExpanded = expanded.has(layer.id);
          const barWidth = Math.max(4, Math.min(100, layer.score));

          return (
            <div key={layer.id}>
              <button
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-elevated/20"
              >
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-txt-secondary transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
                <span className="min-w-0 flex-1 text-xs font-semibold text-txt-primary truncate">{layer.label}</span>
                <span className="shrink-0 font-mono text-xs font-semibold text-txt-primary tabular-nums">
                  +{layer.score}pts
                </span>
                <div className="w-20 h-1.5 rounded-full bg-border-default/30 overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(layer.score)}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>

              {isExpanded && layer.subItems.length > 0 && (
                <div className="border-t border-border-default/50 bg-inset/30 px-4 py-2 space-y-1">
                  {layer.subItems.map((sub, i) => (
                    <div key={`${layer.id}-${i}`} className="flex items-center gap-2 pl-5 text-[11px]">
                      <span className="text-txt-secondary">└</span>
                      <span className="flex-1 text-txt-secondary truncate">{sub.label}</span>
                      {sub.score > 0 && (
                        <span className="font-mono text-[10px] text-txt-primary tabular-nums">+{sub.score}pts</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
