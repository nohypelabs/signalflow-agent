"use client";

import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
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
    <Card variant="glass" padding="none" className="overflow-hidden" data-tour="decision-score">
        <div className="border-b border-border-default px-4 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Live Decision</p>
            <h2 className="mt-1 truncate text-sm font-semibold text-txt-primary">Signal bias and conviction</h2>
          </div>
        </div>

      <div className="decision-hero-body p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
          <div className="min-w-0 flex flex-col gap-4">
            <button
              type="button"
              onClick={onOpenMarketSelector}
              data-tour="market-selector"
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

            <div className="grid grid-cols-2 gap-2 sm:max-w-[360px]">
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
          </div>

          <div className="neu-card flex flex-col items-center" style={{borderRadius: "35px", padding: "24px 20px 20px"}}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-txt-faint mb-3">Conviction</p>
            <SpeedometerGauge value={confidence} size="lg" color={gaugeColor} />
            <div className="mt-5">
              <button
                type="button"
                onClick={onGenerate}
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[35px] px-5 py-3 text-[13px] font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed sm:min-w-[200px]"
                style={{
                  background: "var(--bg-surface)",
                  boxShadow: analyzing
                    ? "inset 3px 3px 8px rgba(0,0,0,0.45), inset -3px -3px 8px rgba(255,255,255,0.03)"
                    : "4px 4px 10px rgba(0,0,0,0.4), -4px -4px 10px rgba(255,255,255,0.03)",
                  color: analyzing ? "var(--text-muted)" : "var(--text-primary)",
                }}
              >
                <span className="text-sm">📶</span>
                <span>{analyzing ? "Generating..." : "Generate Signal"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
