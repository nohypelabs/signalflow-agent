"use client";

import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { LineChart } from "lucide-react";
import { unwrapApiResponse } from "@/lib/api/client";
import type { SoDEXTicker } from "@/lib/types/trade";

interface IndexData {
  ticker: string;
  label: string;
  price: number;
  change24h: number;
  changeAbs: number;
}

const INDICES = [
  { ticker: "MAG7SSI", label: "MAG7" },
  { ticker: "DEFISSI", label: "DeFi" },
  { ticker: "MEMESSI", label: "Meme" },
  { ticker: "USSI", label: "Stable" },
];

function formatPrice(value: number): string {
  if (!value || !Number.isFinite(value)) return "--";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function toneForChange(value: number): string {
  if (value > 0) return "text-buy";
  if (value < 0) return "text-sell";
  return "text-hold";
}

export default function IndexROIDashboard() {
  const [data, setData] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<IndexData[]>([]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const isFirstLoad = dataRef.current.length === 0;
      if (isFirstLoad) setLoading(true);

      try {
        const res = await fetch(`/api/market/tickers`, { cache: "no-store" });
        const json = await res.json();
        const allTickers = unwrapApiResponse<SoDEXTicker[] | null>(json) || [];

        if (cancelled) return;

        const mapped = INDICES.map((meta) => {
          const syms = [
            `v${meta.ticker}_vUSDC`,
            `v${meta.ticker.toLowerCase()}_vUSDC`,
            `v${meta.ticker.toUpperCase()}_vUSDC`,
          ];
          const t = allTickers.find((tt) =>
            syms.some((s) => tt.symbol === s || tt.symbol.toUpperCase() === s.toUpperCase())
          );
          if (!t) return null;
          return {
            ticker: meta.ticker,
            label: meta.label,
            price: parseFloat(t.lastPx) || 0,
            change24h: Number(t.changePct) || 0,
            changeAbs: parseFloat(t.change) || 0,
          };
        }).filter(Boolean) as IndexData[];

        setData(mapped);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          if (dataRef.current.length === 0) {
            setError(e instanceof Error ? e.message : "Failed to fetch index data");
          }
          // keep previous data on refresh errors (real-time resilience)
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 15000); // real-time: 15s refresh for live index prints

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && data.length === 0) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card-sm" className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  if (error && data.length === 0) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">{error}</p>
      </Card>
    );
  }

  const active = data.filter((idx) => idx.price > 0);
  const leader = [...active].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0] ?? null;
  const averageMove = active.length > 0
    ? active.reduce((sum, idx) => sum + idx.change24h, 0) / active.length
    : 0;
  const advancers = active.filter((idx) => idx.change24h > 0).length;
  const decliners = active.filter((idx) => idx.change24h < 0).length;
  const unchanged = Math.max(0, active.length - advancers - decliners);
  const leaderLabel = leader ? INDICES.find((i) => i.ticker === leader.ticker)?.label ?? leader.ticker : "—";
  const averageTone = toneForChange(averageMove);
  const avgDisplay = active.length > 0 ? `${averageMove >= 0 ? "+" : ""}${averageMove.toFixed(2)}%` : "—";

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2">
          <LineChart size={14} className="text-info" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">Index Performance</h3>
          <Badge variant="info" size="sm">LIVE</Badge>
          <span className="inline-block w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" aria-hidden="true" />
        </div>
        <span className={`font-mono text-[9px] uppercase tabular-nums ${averageTone}`}>
          {avgDisplay} avg
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Composite pulse + live count */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={`font-mono text-3xl font-bold leading-none tabular-nums ${averageTone}`}>
              {avgDisplay}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wide text-txt-muted">Composite index pulse</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{active.length}/{INDICES.length}</p>
            <p className="text-[8px] text-txt-muted -mt-px">live indices</p>
          </div>
        </div>

        {/* Breadth: adv / flat / dec */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-buy-dim/30 bg-buy-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-buy tabular-nums">{advancers}</p>
            <p className="text-[8px] uppercase text-txt-muted">adv</p>
          </div>
          <div className="rounded-lg border border-border-default bg-elevated/20 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-txt-secondary tabular-nums">{unchanged}</p>
            <p className="text-[8px] uppercase text-txt-muted">flat</p>
          </div>
          <div className="rounded-lg border border-sell-dim/30 bg-sell-muted/10 px-2 py-1.5">
            <p className="font-mono text-sm font-bold text-sell tabular-nums">{decliners}</p>
            <p className="text-[8px] uppercase text-txt-muted">dec</p>
          </div>
        </div>

        {/* Components - complete, scannable list (real-time rows) */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Basket (24h)</span>
            {leader && (
              <span className={`font-mono text-[9px] font-bold tabular-nums ${toneForChange(leader.change24h)}`}>
                Leader {leaderLabel} {leader.change24h >= 0 ? "+" : ""}{leader.change24h.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="space-y-px rounded-lg border border-border-default bg-inset/40 p-1">
            {INDICES.map((meta) => {
              const idx = data.find((item) => item.ticker === meta.ticker);
              const change = idx?.change24h ?? 0;
              const price = idx?.price ?? 0;
              const absCh = idx?.changeAbs ?? 0;
              const tone = toneForChange(change);
              const isLeader = leader?.ticker === meta.ticker;
              const chStr = idx ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—";
              return (
                <div
                  key={meta.ticker}
                  className={`flex items-center justify-between rounded px-2 py-1 text-[11px] transition-colors ${
                    isLeader ? "bg-accent/10 border-l-2 border-accent pl-1.5" : "hover:bg-elevated/30"
                  }`}
                >
                  <span className="font-semibold text-txt-primary w-[52px] shrink-0">{meta.label}</span>
                  <span className="font-mono text-[10px] text-txt-faint tabular-nums flex-1 text-right pr-2">
                    {idx ? formatPrice(price) : "—"}
                    {idx && Math.abs(absCh) > 0.0001 && (
                      <span className={`ml-1 text-[9px] tabular-nums ${toneForChange(absCh)}`}>
                        ({absCh >= 0 ? "+" : ""}{absCh.toFixed(2)})
                      </span>
                    )}
                  </span>
                  <span className={`font-mono font-bold tabular-nums w-[62px] text-right ${tone}`}>
                    {chStr}
                  </span>
                </div>
              );
            })}
          </div>

          {active.length === 0 && (
            <p className="mt-2 text-[9px] leading-snug text-txt-muted">
              Waiting for SoDEX index prints from MAG7, DeFi, Meme, and Stable baskets.
            </p>
          )}
          {active.length > 0 && active.length < INDICES.length && (
            <p className="mt-1 text-[9px] text-hold">Some baskets offline — data partial.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
