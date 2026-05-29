"use client";

import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

/* ── Helpers ── */

function fmtPrice(p: number): string {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

/* ── Action config ── */

const actionConfig: Record<string, { color: string; bg: string; border: string; glow: string; label: string }> = {
  BUY: { color: "text-buy", bg: "bg-buy-muted", border: "border-l-border-default", glow: "", label: "LONG" },
  SELL: { color: "text-sell", bg: "bg-sell-muted", border: "border-l-border-default", glow: "", label: "SHORT" },
  HOLD: { color: "text-hold", bg: "bg-hold-muted", border: "border-l-border-default", glow: "", label: "NO TRADE" },
};

/* ── Props ── */

interface Props {
  onSelect: (s: Signal) => void;
  selected: string | null;
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
  className?: string;
}

/* ── Component ── */

export default function SignalList({ onSelect, selected, tickers, liveSignals, className = "" }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const displaySignals = liveSignals && liveSignals.length > 0 ? liveSignals : [];
  const isLive = liveSignals && liveSignals.length > 0;

  // Find highest-confidence signal
  const topSignal = displaySignals.reduce<Signal | null>(
    (best, s) => (!best || s.confidence > best.confidence ? s : best),
    null,
  );

  return (
    <div className={`w-full min-w-0 h-full flex flex-col bg-card border border-border-default rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-txt-secondary">Live Signal Feed</h3>
          {isLive && (
            <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider font-bold text-buy bg-buy-muted px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <span className="text-[10px] text-txt-faint font-mono">{displaySignals.length}</span>
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {displaySignals.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="w-8 h-8 rounded-full bg-elevated mx-auto mb-3 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
                <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />
              </svg>
            </div>
            <p className="text-xs text-txt-muted">Waiting for signals</p>
            <p className="text-[10px] text-txt-faint mt-1">Data loading from SoSoValue + SoDEX</p>
          </div>
        )}

        {displaySignals.map((s) => {
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;
          const cfg = actionConfig[s.action] ?? actionConfig.HOLD;
          const isSelected = selected === s.id;
          const isTop = topSignal?.id === s.id;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`
                text-left w-full px-4 py-3 cursor-pointer transition-all duration-200 border-l-2 ${cfg.border}
                ${isSelected
                  ? `bg-elevated/80 ring-1 ring-inset ring-border-muted ${cfg.glow}`
                  : isTop
                    ? `bg-elevated/30 ${cfg.glow}`
                    : "bg-transparent hover:bg-elevated/20"
                }
              `}
            >
              {/* Row 1: Pair + Action + Confidence */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-txt-primary">{s.pair}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {isTop && (
                    <span className="text-[8px] uppercase tracking-wider font-bold px-1 py-0.5 rounded bg-elevated text-txt-secondary">
                      TOP
                    </span>
                  )}
                </div>
                <ConfidenceGauge value={s.confidence} size="sm" />
              </div>

              {/* Row 2: Price + Change */}
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-xs font-mono font-semibold text-txt-primary tabular-nums">
                  {fmtPrice(price)}
                </span>
                <span className={`text-[10px] font-mono font-semibold tabular-nums ${chg >= 0 ? "text-buy" : "text-sell"}`}>
                  {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                </span>
              </div>

              {/* Row 3: Reasoning snippet */}
              {s.reasoning && (
                <p className="text-[10px] text-txt-dim leading-relaxed mb-1.5">
                  {truncate(s.reasoning, 100)}
                </p>
              )}

              {/* Row 4: Execution preview + time */}
              <div className="flex items-center justify-between">
                {s.execution.entry > 0 && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-txt-faint">
                    <span>Entry <span className="text-txt-secondary">{fmtPrice(s.execution.entry)}</span></span>
                    <span>TP <span className="text-buy">{fmtPrice(s.execution.takeProfit)}</span></span>
                    <span>SL <span className="text-sell">{fmtPrice(s.execution.stopLoss)}</span></span>
                  </div>
                )}
                <span className="text-[9px] text-txt-faint ml-auto">{s.timeAgo}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {displaySignals.length > 0 && (
        <div className="px-4 py-2 border-t border-border-default shrink-0">
          <div className="flex items-center justify-between text-[9px] text-txt-faint">
            <span>SoSoValue + SoDEX</span>
            <span>{displaySignals.length} signals</span>
          </div>
        </div>
      )}
    </div>
  );
}
