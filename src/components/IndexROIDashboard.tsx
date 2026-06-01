"use client";

import { useState, useEffect } from "react";
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
}

const INDICES = [
  { ticker: "MAG7ssi", label: "MAG7" },
  { ticker: "DEFIssi", label: "DeFi" },
  { ticker: "MEMEssi", label: "Meme" },
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(
      INDICES.map(async (idx) => {
        try {
          const res = await fetch(`/api/market/tickers?symbol=v${idx.ticker}_vUSDC`, { cache: "no-store" });
          const json = unwrapApiResponse<SoDEXTicker | SoDEXTicker[]>(await res.json());
          const arr = Array.isArray(json) ? json : [json];
          const t = arr[0];
          if (!t) return null;
          return {
            ticker: idx.ticker,
            label: idx.label,
            price: parseFloat(t.lastPx) || 0,
            change24h: t.changePct || 0,
          };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setData(results.filter(Boolean) as IndexData[]);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("Failed to fetch index data");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
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

  if (error) {
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
  const leaderLabel = leader ? INDICES.find((i) => i.ticker === leader.ticker)?.label ?? leader.ticker : "Waiting";
  const averageTone = toneForChange(averageMove);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <div className="flex items-center gap-2">
          <LineChart size={14} className="text-info" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">Index Performance</h3>
          <Badge variant="info" size="sm">Live</Badge>
        </div>
        <span className={`font-mono text-[9px] uppercase tabular-nums ${averageTone}`}>
          {active.length > 0 ? `${averageMove >= 0 ? "+" : ""}${averageMove.toFixed(2)}% avg` : "sync"}
        </span>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className={`font-mono text-3xl font-bold leading-none tabular-nums ${averageTone}`}>
              {averageMove >= 0 ? "+" : ""}{averageMove.toFixed(2)}%
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-txt-muted">Composite index pulse</p>
          </div>
          <div className="min-w-[104px] rounded-lg border border-info/20 bg-[#00d4ff08] p-2 text-right">
            <p className="font-mono text-sm font-bold text-txt-primary tabular-nums">{active.length}/{INDICES.length}</p>
            <p className="mt-0.5 text-[9px] text-txt-muted">live indices</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
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

        <div className="mt-3 rounded-lg border border-border-default bg-inset/50 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-txt-muted">Leader</span>
            <span className={`font-mono text-[10px] font-bold tabular-nums ${leader ? toneForChange(leader.change24h) : "text-txt-muted"}`}>
              {leader ? `${leaderLabel} ${leader.change24h >= 0 ? "+" : ""}${leader.change24h.toFixed(2)}%` : "waiting"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {INDICES.map((meta) => {
              const idx = data.find((item) => item.ticker === meta.ticker);
              const change = idx?.change24h ?? 0;
              const isUp = change >= 0;
              return (
                <div key={meta.ticker} className="rounded-md border border-border-default/70 bg-elevated/20 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-txt-primary">{meta.label}</span>
                    <span className={`font-mono text-[10px] font-bold tabular-nums ${toneForChange(change)}`}>
                      {idx ? `${isUp ? "+" : ""}${change.toFixed(2)}%` : "--"}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[9px] text-txt-muted">{idx ? formatPrice(idx.price) : "No print"}</p>
                </div>
              );
            })}
          </div>

          {active.length === 0 && (
            <p className="mt-2 text-[9px] leading-snug text-txt-muted">
              Waiting for SoDEX index prints from MAG7, DeFi, Meme, and Stable baskets.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
