"use client";

import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Badge from "@/components/ui/Badge";

interface Props {
  signals: Signal[];
  selectedId: string | null;
  tickerMap: Map<string, SoDEXTicker>;
  onSelect: (signal: Signal) => void;
}

function fmtPrice(value: number): string {
  if (value >= 10000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 100) return `$${value.toFixed(2)}`;
  if (value >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(5)}`;
}

function variantFor(action: Signal["action"]): string {
  if (action === "LONG") return "buy";
  if (action === "SHORT") return "sell";
  return "hold";
}

function labelFor(action: Signal["action"]): string {
  if (action === "HOLD") return "NO TRADE";
  return action;
}

export default function SignalStream({ signals, selectedId, tickerMap, onSelect }: Props) {
  return (
    <section className="bg-card border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-txt-faint font-semibold">Signal Stream</p>
          <h2 className="mt-0.5 text-sm font-semibold text-txt-primary">Live engine events</h2>
        </div>
        <Badge variant={signals.length > 0 ? "live" : "muted"} size="sm">{signals.length} events</Badge>
      </div>

      <div className="divide-y divide-border-default max-h-[248px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-txt-muted">Waiting for signal stream</p>
            <p className="mt-1 text-[10px] text-txt-faint">SoSoValue and SoDEX feeds are syncing.</p>
          </div>
        ) : (
          signals.slice(0, 8).map((signal) => {
            const symbol = pairToSodexSymbol(signal.pair);
            const ticker = symbol ? tickerMap.get(symbol) : undefined;
            const livePrice = ticker ? parseFloat(ticker.lastPx) : signal.price;
            const change = ticker ? ticker.changePct : signal.change24h;
            const selected = selectedId === signal.id;

            return (
              <button
                key={signal.id}
                type="button"
                onClick={() => onSelect(signal)}
                className={`w-full px-4 py-2.5 text-left transition-colors ${selected ? "bg-elevated/50" : "hover:bg-elevated/20"}`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-txt-primary truncate">{signal.pair}</span>
                      <Badge variant={variantFor(signal.action)} size="sm">{labelFor(signal.action)}</Badge>
                      {selected && <span className="text-[8px] uppercase text-accent font-bold">Active</span>}
                    </div>
                    <p className="mt-1 text-[10px] text-txt-dim truncate">{signal.reasoning}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-txt-primary">{fmtPrice(livePrice)}</p>
                    <p className={`text-[10px] font-mono ${change >= 0 ? "text-buy" : "text-sell"}`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
