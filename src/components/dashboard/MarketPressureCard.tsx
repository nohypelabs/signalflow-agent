"use client";

import { TrendingUp } from "lucide-react";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";

interface Props {
  tickers: SoDEXTicker[];
  signals: Signal[];
  marketLoading: boolean;
  marketError: string | null;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export default function MarketPressureCard({ tickers, signals, marketLoading, marketError }: Props) {
  const parsed = tickers
    .map((t) => ({
      symbol: t.symbol.replace(/^v/, "").replace(/_vUSDC$/, ""),
      change: toFiniteNumber(t.changePct),
      price: toFiniteNumber(t.lastPx),
      volume: toFiniteNumber(t.quoteVolume),
    }))
    .filter((t) => t.price > 0)
    .sort((a, b) => b.change - a.change);

  const topMovers = parsed.slice(0, 4);
  const bottomMovers = parsed.slice(-4).reverse();
  const maxAbs = Math.max(...parsed.map((t) => Math.abs(t.change)), 1);
  const advancing = parsed.filter((t) => t.change > 0).length;
  const declining = parsed.filter((t) => t.change < 0).length;
  const unchanged = Math.max(0, parsed.length - advancing - declining);
  const breadth = parsed.length > 0 ? Math.round((advancing / parsed.length) * 100) : null;
  const pressureScore = parsed.length > 0 ? Math.round(((advancing - declining) / parsed.length) * 100) : 0;

  const pressureTone = pressureScore > 10 ? "text-buy" : pressureScore < -10 ? "text-sell" : "text-hold";
  const pressureLabel = pressureScore > 10 ? "bid-led" : pressureScore < -10 ? "offer-led" : "balanced";

  const totalPairs = Math.max(1, parsed.length);
  const advPct = Math.round((advancing / totalPairs) * 100);
  const decPct = Math.round((declining / totalPairs) * 100);
  const flatPct = Math.max(0, 100 - advPct - decPct);

  function normalizePair(pair: string): string {
    return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
  }

  const getSignalFor = (sym: string) => {
    const target = normalizePair(sym + "/USDC");
    return signals.find((s) => normalizePair(s.pair) === target) || null;
  };

  function ChangeBar({ change }: { change: number }) {
    const width = maxAbs > 0 ? Math.min(100, (Math.abs(change) / maxAbs) * 100) : 0;
    const isPositive = change >= 0;
    return (
      <div className="h-1 w-full rounded-full bg-border-default/30 overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${width}%`,
            background: isPositive
              ? "linear-gradient(90deg, var(--color-buy-muted), var(--color-buy))"
              : "linear-gradient(90deg, var(--color-sell-muted), var(--color-sell))",
          }}
        />
      </div>
    );
  }

  return (
    <Card variant="default" padding="none" className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-buy" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Market Pressure</p>
        </div>
        <span className={`font-mono text-[9px] uppercase tabular-nums ${parsed.length > 0 ? pressureTone : "text-txt-muted"}`}>
          {parsed.length === 0 ? "waiting" : pressureLabel}
        </span>
      </div>

      {parsed.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <TrendingUp size={18} className="text-txt-muted" />
          <p className="text-xs font-semibold text-txt-secondary">
            {marketLoading ? "Loading market tape" : "Market tape unavailable"}
          </p>
          <p className="max-w-[220px] text-[10px] leading-snug text-txt-muted">
            {marketError ?? "Waiting for tradable pair prices."}
          </p>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`font-mono text-3xl font-bold leading-none tabular-nums ${pressureTone}`}>
                {pressureScore > 0 ? "+" : ""}{pressureScore}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Pressure impulse</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{breadth ?? 0}%</p>
              <p className="text-[9px] text-txt-muted">advancing breadth</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
              <p className="font-mono text-sm font-bold text-buy tabular-nums">{advancing}</p>
              <p className="text-[8px] uppercase text-txt-muted">adv</p>
            </div>
            <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
              <p className="font-mono text-sm font-bold text-txt-secondary tabular-nums">{unchanged}</p>
              <p className="text-[8px] uppercase text-txt-muted">flat</p>
            </div>
            <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
              <p className="font-mono text-sm font-bold text-sell tabular-nums">{declining}</p>
              <p className="text-[8px] uppercase text-txt-muted">dec</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Tape Leaders</span>
              <span className="font-mono text-[9px] text-txt-muted tabular-nums">{parsed.length} pairs</span>
            </div>

            <div className="rounded-lg border border-border-default bg-inset/40 p-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-buy" />
                      <span className="text-[9px] font-semibold text-buy tracking-wide">Bid</span>
                    </div>
                  </div>
                  <div className="space-y-px">
                    {topMovers.map((t, i) => {
                      const sig = getSignalFor(t.symbol);
                      const hasSignal = sig && sig.action !== "HOLD";
                      return (
                        <div key={t.symbol} className={`flex items-center gap-1 rounded px-1 py-[1px] text-[9px] ${i === 0 ? "bg-buy-muted/10" : ""}`}>
                          <span className="w-4 text-right font-mono text-[8px] text-txt-dim tabular-nums">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-txt-primary">{t.symbol}</span>
                          {hasSignal && (
                            <span className={`font-mono text-[7px] px-0.5 rounded font-bold tabular-nums ${sig.action === "LONG" ? "bg-buy text-white" : "bg-sell text-white"}`}>
                              {sig.action[0]}{Math.round(sig.confidence)}
                            </span>
                          )}
                          <span className="font-mono text-[8px] font-bold tabular-nums text-buy">+{Math.abs(t.change).toFixed(1)}%</span>
                          <div className="w-6 shrink-0">
                            <ChangeBar change={t.change} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sell" />
                      <span className="text-[9px] font-semibold text-sell tracking-wide">Offer</span>
                    </div>
                  </div>
                  <div className="space-y-px">
                    {bottomMovers.map((t, i) => {
                      const sig = getSignalFor(t.symbol);
                      const hasSignal = sig && sig.action !== "HOLD";
                      return (
                        <div key={t.symbol} className={`flex items-center gap-1 rounded px-1 py-[1px] text-[9px] ${i === 0 ? "bg-sell-muted/10" : ""}`}>
                          <span className="w-4 text-right font-mono text-[8px] text-txt-dim tabular-nums">{parsed.length - 3 + i}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-txt-primary">{t.symbol}</span>
                          {hasSignal && (
                            <span className={`font-mono text-[7px] px-0.5 rounded font-bold tabular-nums ${sig.action === "LONG" ? "bg-buy text-white" : "bg-sell text-white"}`}>
                              {sig.action[0]}{Math.round(sig.confidence)}
                            </span>
                          )}
                          <span className="font-mono text-[8px] font-bold tabular-nums text-sell">{t.change.toFixed(1)}%</span>
                          <div className="w-6 shrink-0">
                            <ChangeBar change={t.change} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[8px] font-semibold uppercase tracking-wide text-txt-muted">Pressure Distribution</span>
              <span className="text-[7px] text-txt-muted">{totalPairs} pairs</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[7px]">
              <div>
                <div className="flex justify-between text-buy mb-0.5">
                  <span>Advancing</span>
                  <span className="font-mono tabular-nums">{advPct}% ({advancing})</span>
                </div>
                <div className="h-2.5 bg-buy/20 rounded overflow-hidden">
                  <div className="h-2.5 bg-buy transition-all" style={{ width: `${advPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sell mb-0.5">
                  <span>Declining</span>
                  <span className="font-mono tabular-nums">{decPct}% ({declining})</span>
                </div>
                <div className="h-2.5 bg-sell/20 rounded overflow-hidden">
                  <div className="h-2.5 bg-sell transition-all" style={{ width: `${decPct}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-0.5 text-center text-[7px] text-txt-secondary tabular-nums">
              {flatPct}% flat ({unchanged} pairs)
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
