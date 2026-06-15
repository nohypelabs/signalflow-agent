"use client";

import { Activity, Grid2x2, BarChart3 } from "lucide-react";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";

interface Props {
  tickers: SoDEXTicker[];
  signals: Signal[];
  selectedPair: string;
  marketLoading: boolean;
  marketError: string | null;
  sodexStatus: "connected" | "error" | "loading";
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function formatAssetPrice(price: number): string {
  if (price >= 100000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function ExecutionReadinessCard({ tickers, signals, selectedPair, marketLoading, marketError, sodexStatus }: Props) {
  const activePairs = tickers.filter((t) => toFiniteNumber(t.lastPx) > 0).length;
  const buySignals = signals.filter((s) => s.action === "LONG").length;
  const sellSignals = signals.filter((s) => s.action === "SHORT").length;
  const totalSignals = buySignals + sellSignals;

  const selectedTicker = tickers.find((t) => t.symbol === selectedPair || t.symbol.replace(/^v/, "").replace(/_vUSDC$/, "") === selectedPair.replace("/", ""));
  const selectedPrice = toFiniteNumber(selectedTicker?.lastPx);
  const selectedVolume = toFiniteNumber(selectedTicker?.quoteVolume);
  const selectedBid = toFiniteNumber(selectedTicker?.bidPx);
  const selectedAsk = toFiniteNumber(selectedTicker?.askPx);
  const selectedBidSize = toFiniteNumber(selectedTicker?.bidSz);
  const selectedAskSize = toFiniteNumber(selectedTicker?.askSz);
  const selectedSpreadBps = selectedBid > 0 && selectedAsk > selectedBid
    ? ((selectedAsk - selectedBid) / selectedPrice) * 10000
    : null;
  const selectedDepth = selectedBidSize + selectedAskSize;

  const coverage = activePairs > 0 ? Math.min(100, Math.round((signals.length / activePairs) * 100)) : 0;
  const spreadBonus = selectedSpreadBps == null ? 0 : selectedSpreadBps <= 8 ? 15 : selectedSpreadBps <= 20 ? 10 : 4;
  const depthBonus = selectedDepth > 0 ? 10 : 0;
  const readinessScore = Math.min(100, Math.round((coverage * 0.45) + (selectedVolume > 0 ? 20 : 0) + (totalSignals > 0 ? 15 : 0) + spreadBonus + depthBonus));

  const longShare = totalSignals > 0 ? Math.round((buySignals / totalSignals) * 100) : 0;
  const shortShare = totalSignals > 0 ? Math.round((sellSignals / totalSignals) * 100) : 0;

  const statusTone = marketLoading
    ? "text-hold"
    : marketError || sodexStatus === "error"
      ? "text-sell"
      : "text-buy";
  const statusLabel = marketLoading
    ? "syncing"
    : marketError || sodexStatus === "error"
      ? "degraded"
      : "ready";

  return (
    <Card variant="glass" padding="none" className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-accent" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Execution Readiness</p>
        </div>
        <span className={`font-mono text-[9px] tabular-nums ${statusTone}`}>{statusLabel}</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`font-mono text-3xl font-bold leading-none tabular-nums ${statusTone}`}>
              {readinessScore}%
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Execution readiness</p>
          </div>
          <div className="min-w-[104px] rounded-lg border border-accent-dim/30 bg-accent-muted/10 p-2 text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">
              {selectedVolume > 0 ? fmtUsd(selectedVolume) : "--"}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-txt-muted">{selectedPair}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-info/20 bg-[#00d4ff08] px-2 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-txt-muted">
              <Grid2x2 size={14} className="text-info" /> Feed Coverage
            </span>
            <p className="mt-1 font-mono text-lg font-bold leading-none text-txt-primary tabular-nums">{coverage}%</p>
            <p className="mt-1 text-[9px] text-txt-muted">{signals.length}/{activePairs || 0} pairs</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold text-txt-muted">
              <BarChart3 size={14} className="text-accent" /> Order Bias
            </span>
            <p className="mt-1 font-mono text-lg font-bold leading-none text-txt-primary tabular-nums">{totalSignals}</p>
            <p className="mt-1 text-[9px] text-txt-muted">actionable</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{selectedPrice > 0 ? formatAssetPrice(selectedPrice) : "--"}</p>
            <p className="text-[8px] uppercase text-txt-muted">mark</p>
          </div>
          <div className="rounded-lg border border-accent-dim/30 bg-accent-muted/10 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-accent tabular-nums">{selectedSpreadBps == null ? "--" : selectedSpreadBps.toFixed(1)}</p>
            <p className="text-[8px] uppercase text-txt-muted">spread bps</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-xs font-bold text-txt-primary tabular-nums">{selectedDepth > 0 ? selectedDepth.toFixed(2) : "--"}</p>
            <p className="text-[8px] uppercase text-txt-muted">top depth</p>
          </div>
        </div>

        <div className="rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[9px]">
            <span className="font-semibold text-buy">LONG {buySignals}</span>
            <span className="font-mono text-txt-muted tabular-nums">{longShare}% / {shortShare}%</span>
            <span className="font-semibold text-sell">SHORT {sellSignals}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-hold-muted">
            <div className="bg-buy transition-all duration-700" style={{ width: `${longShare}%` }} />
            <div className="bg-sell transition-all duration-700" style={{ width: `${shortShare}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
