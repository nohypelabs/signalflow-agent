"use client";

import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

interface Props {
  signal: Signal | null;
  tickerMap: Map<string, SoDEXTicker>;
  isConnected: boolean;
  analyzing: boolean;
  onExecuteSignal: (signal: Signal) => void;
  onGenerate: () => void;
  onPinSignal: () => void;
}

function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return "-";
  if (value >= 10000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 100) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(5)}`;
}

function actionMeta(signal: Signal | null): { label: string; variant: string; toneClass: string; executable: boolean } {
  if (!signal) return { label: "WAITING", variant: "muted", toneClass: "text-txt-primary", executable: false };
  if (signal.action === "LONG") return { label: "LONG", variant: "buy", toneClass: "text-buy", executable: true };
  if (signal.action === "SHORT") return { label: "SHORT", variant: "sell", toneClass: "text-sell", executable: true };
  return { label: "NO TRADE", variant: "hold", toneClass: "text-hold", executable: false };
}

function livePriceFor(signal: Signal, tickerMap: Map<string, SoDEXTicker>): number | null {
  const symbol = pairToSodexSymbol(signal.pair);
  const ticker = symbol ? tickerMap.get(symbol) : undefined;
  if (!ticker) return null;
  const price = parseFloat(ticker.lastPx);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export default function CurrentDecisionPanel({
  signal,
  tickerMap,
  isConnected,
  analyzing,
  onExecuteSignal,
  onGenerate,
  onPinSignal,
}: Props) {
  const meta = actionMeta(signal);
  const livePrice = signal ? livePriceFor(signal, tickerMap) : null;
  const entry = livePrice ?? signal?.execution.entry ?? signal?.price ?? null;
  const canExecute = !!signal && meta.executable && !!entry;
  const riskPct = signal && entry && signal.execution.stopLoss > 0
    ? (Math.abs(entry - signal.execution.stopLoss) / entry) * 100
    : null;
  const rewardPct = signal && entry && signal.execution.takeProfit > 0
    ? (Math.abs(signal.execution.takeProfit - entry) / entry) * 100
    : null;

  return (
    <aside className="h-full bg-card border border-border-default rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-txt-secondary">Current Decision</p>
          <h2 className="mt-0.5 text-sm font-semibold text-txt-primary truncate">
            {signal ? signal.pair : "Waiting for qualified flow"}
          </h2>
        </div>
        <Badge variant={meta.variant} size="md">{meta.label}</Badge>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        {signal ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={`text-[34px] font-semibold leading-none ${meta.toneClass}`}>{meta.label}</p>
                <p className="mt-1 text-[10px] uppercase text-txt-primary">
                  {livePrice ? "Live SoDEX mark" : "Signal entry reference"}
                </p>
              </div>
              <ConfidenceGauge value={signal.confidence} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Entry", fmtPrice(entry), "text-txt-primary"],
                ["Take Profit", fmtPrice(signal.execution.takeProfit), "text-buy"],
                ["Stop Loss", fmtPrice(signal.execution.stopLoss), "text-sell"],
                ["Risk/Reward", signal.execution.riskReward || "-", "text-txt-primary"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-lg bg-inset/40 border border-border-default px-3 py-2">
                  <p className="text-[9px] uppercase text-txt-primary">{label}</p>
                  <p className={`mt-1 text-xs font-mono font-semibold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-inset/30 border border-border-default p-3">
              <div className="flex items-center justify-between gap-3 text-[10px] text-txt-primary">
                <span>Risk to SL</span>
                <span className="font-mono text-sell">{riskPct === null ? "-" : `${riskPct.toFixed(2)}%`}</span>
              </div>
              <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-sell rounded-full" style={{ width: `${Math.min(100, (riskPct ?? 0) * 8)}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-txt-primary">
                <span>Reward to TP</span>
                <span className="font-mono text-buy">{rewardPct === null ? "-" : `${rewardPct.toFixed(2)}%`}</span>
              </div>
              <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-buy rounded-full" style={{ width: `${Math.min(100, (rewardPct ?? 0) * 8)}%` }} />
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-txt-primary line-clamp-3">{signal.reasoning}</p>

            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="w-full"
                disabled={!canExecute}
                onClick={() => {
                  if (signal && canExecute) onExecuteSignal(signal);
                }}
              >
                {canExecute ? "Execute" : signal.action === "HOLD" ? "No Trade" : "Unavailable"}
              </Button>
              <a
                href={signal ? `/trading?pair=${encodeURIComponent(signal.pair)}&signal=${encodeURIComponent(signal.id)}` : "/trading"}
                className="inline-flex items-center justify-center rounded-lg border border-border-default px-3 py-1.5 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:border-border-muted hover:bg-elevated/25 transition-colors"
              >
                Trading Desk
              </a>
              <button
                type="button"
                onClick={onPinSignal}
                className="col-span-2 rounded-lg border border-border-default px-3 py-1.5 text-xs font-semibold text-txt-primary hover:text-txt-secondary hover:border-border-muted hover:bg-elevated/25 transition-colors"
              >
                Pin as active decision
              </button>
            </div>

            {!isConnected && (
              <p className="text-[10px] text-txt-secondary">Wallet is not connected. Paper flow remains available from the trading desk.</p>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center text-center py-8">
            <div className="mx-auto w-10 h-10 rounded-lg border border-border-default bg-inset/40 flex items-center justify-center text-txt-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12h4l2-7 4 14 2-7h4" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-txt-primary">No active decision yet</h3>
            <p className="mt-1 text-xs text-txt-secondary max-w-[260px] mx-auto">
              Generate or select a live signal to turn the market feed into a trade setup.
            </p>
            <Button className="mt-5 mx-auto" size="sm" loading={analyzing} onClick={onGenerate}>
              Generate Signal
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
