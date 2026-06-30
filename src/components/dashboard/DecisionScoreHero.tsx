"use client";

import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import SpeedometerGauge from "@/components/ui/SpeedometerGauge";

interface Props {
  signal: Signal | null;
  analyzing: boolean;
  onGenerate: () => void;
  selectedPair: string;
  selectedPairMeta: string;
  onOpenMarketSelector: () => void;
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

export default function DecisionScoreHero({
  signal,
  analyzing,
  onGenerate,
  selectedPair,
  selectedPairMeta,
  onOpenMarketSelector,
}: Props) {
  const action = actionLabel(signal);
  const confidence = signal ? Math.round(signal.confidence) : 0;
  const gaugeColor = signal ? getSignalColor(confidence, action) : "#6B7280";

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Live Decision</p>
          <h2 className="mt-1 truncate text-sm font-semibold text-txt-primary">Signal bias and conviction</h2>
        </div>
        <Badge variant={actionVariant(signal)} size="md">{action}</Badge>
      </div>

      <div className="decision-hero-body p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
          <div className="min-w-0">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onOpenMarketSelector}
                className="glass-control inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-[35px] px-4 py-2.5 text-[12px] font-semibold text-txt-secondary transition-colors hover:text-txt-primary"
              >
                <span className="text-txt-faint">Ticker</span>
                <span className="text-txt-primary">{selectedPair}</span>
                <span className="text-txt-faint">Change</span>
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-faint">Selected Market</p>
                <h3 className={`decision-hero-title mt-1 text-[30px] font-semibold leading-none tracking-tight lg:text-[38px] ${actionTone(signal)}`}>
                  {selectedPair}
                </h3>
                <p className="mt-2 text-[13px] text-txt-secondary">{selectedPairMeta}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-[360px]">
              <div className="glass-pill px-3 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-txt-faint">Bias</p>
                <p className={`mt-1 text-sm font-semibold ${actionTone(signal)}`}>{action}</p>
              </div>
              <div className="glass-pill px-3 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-txt-faint">Score</p>
                <p className="mt-1 text-sm font-semibold text-txt-primary">
                  {signal ? `${confidence}%` : "waiting"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={onGenerate}
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[35px] border px-5 py-3 text-[13px] font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[190px]"
                style={{
                  borderColor: gaugeColor + "80",
                  color: gaugeColor,
                  backgroundColor: gaugeColor + "10",
                }}
              >
                <span className="text-sm">📶</span>
                <span>Generate Signal</span>
              </button>
            </div>
          </div>

          <div className="glass-pill flex h-full min-h-[200px] flex-col items-center justify-center px-5 py-4">
            <div className="flex flex-col items-center justify-center text-center">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-faint">Conviction</p>
              <SpeedometerGauge value={confidence} size="lg" color={gaugeColor} />
              <p className={`mt-2 text-sm font-semibold ${actionTone(signal)}`}>{action}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
