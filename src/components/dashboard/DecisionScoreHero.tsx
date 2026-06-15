"use client";

import { Play } from "lucide-react";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";

interface Props {
  signal: Signal | null;
  analyzing: boolean;
  onGenerate: () => void;
  onExecute: () => void;
}

function actionLabel(signal: Signal | null): string {
  if (!signal) return "WAITING";
  return signal.action === "HOLD" ? "NO TRADE" : signal.action;
}

function actionVariant(signal: Signal | null): string {
  if (!signal) return "muted";
  if (signal.action === "LONG") return "buy";
  if (signal.action === "SHORT") return "sell";
  return "hold";
}

function actionTone(signal: Signal | null): string {
  if (!signal) return "text-txt-primary";
  if (signal.action === "LONG") return "text-buy";
  if (signal.action === "SHORT") return "text-sell";
  return "text-hold";
}

function getSignalColor(confidence: number, action: string): string {
  if (action === "LONG" && confidence >= 75) return "#22c55e";
  if (action === "SHORT" || confidence < 50) return "#ef4444";
  return "#f59e0b";
}

export default function DecisionScoreHero({ signal, analyzing, onGenerate, onExecute }: Props) {
  const action = actionLabel(signal);
  const confidence = signal ? Math.round(signal.confidence) : 0;
  const canExecute = !!signal && action !== "NO TRADE";
  const gaugeColor = signal ? getSignalColor(confidence, action) : "#6B7280";

  return (
    <Card variant="glass" padding="none" className="overflow-hidden rounded-xl">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Decision Score</p>
        <h2 className="mt-1 text-sm font-semibold text-txt-primary">Current signal bias and conviction</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={actionVariant(signal)} size="md">{action}</Badge>
              {signal?.quality?.status && (
                <Badge variant={signal.quality.status === "actionable" ? "buy" : signal.quality.status === "blocked" ? "sell" : "hold"} size="sm">
                  {signal.quality.status}
                </Badge>
              )}
            </div>
            <p className={`mt-2 text-3xl font-semibold tracking-tight lg:text-[40px] ${actionTone(signal)}`}>
              {signal ? signal.pair : "Waiting for flow"}
            </p>
            <p className="mt-1 text-[11px] text-txt-secondary">
              {signal ? `${confidence}% confidence` : "Generate a signal to begin"}
            </p>
          </div>
          <SpeedometerGauge value={confidence} size="lg" color={gaugeColor} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor: gaugeColor + "80",
              color: gaugeColor,
              backgroundColor: gaugeColor + "10",
            }}
          >
            <span className="text-sm">📶</span>
            <span>Generate Signal</span>
          </button>

          <button
            type="button"
            onClick={onExecute}
            disabled={!canExecute}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:bg-[#334155] disabled:text-[#64748b] disabled:cursor-not-allowed"
            style={{ backgroundColor: canExecute ? gaugeColor : undefined }}
          >
            <Play size={14} fill="currentColor" />
            <span>Execute Setup</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
