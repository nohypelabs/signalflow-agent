"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { unwrapApiResponse } from "@/lib/api/client";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { MarketSnapshot } from "@/lib/sosovalue";

interface ProfileData {
  symbol: string;
  displayName: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  marketcap: number;
  ath: number;
  downFromATH: string;
  marketcapRank: number;
}

interface Props {
  symbol: string; // SoDEX symbol like vBTC_vUSDC
  snapshot?: MarketSnapshot | null;
}

function fmtUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function CompanyProfileCard({ symbol, snapshot }: Props) {
  const [ticker, setTicker] = useState<SoDEXTicker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/tickers?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(unwrapApiResponse<SoDEXTicker | SoDEXTicker[]>)
      .then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d) ? d : [d];
        setTicker(arr[0] ?? null);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card-sm" className="h-14" />
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

  if (!ticker) {
    return (
      <Card padding="sm">
        <p className="text-xs text-txt-muted">No data for {symbol}</p>
      </Card>
    );
  }

  const price = parseFloat(ticker.lastPx);
  const high = parseFloat(ticker.highPx);
  const low = parseFloat(ticker.lowPx);
  const base = symbol.replace(/^v/, "").replace(/_vUSDC$/, "");

  const profile: ProfileData = {
    symbol: base,
    displayName: `${base}/USDC`,
    price,
    change24h: ticker.changePct,
    high24h: high,
    low24h: low,
    marketcap: snapshot?.marketcap ?? 0,
    ath: snapshot?.ath ?? 0,
    downFromATH: snapshot?.down_from_ath ?? "—",
    marketcapRank: snapshot?.marketcap_rank ?? 0,
  };

  // Price position in 24h range
  const range = high - low;
  const posPct = range > 0 ? ((price - low) / range) * 100 : 50;

  return (
    <Card padding="none" accent={profile.change24h >= 0 ? "#00ff88" : "#ff4444"}>
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-txt-primary">{profile.displayName}</span>
            <Badge variant={profile.change24h >= 0 ? "buy" : "sell"} size="sm">
              {profile.change24h >= 0 ? "+" : ""}{profile.change24h.toFixed(2)}%
            </Badge>
          </div>
          {profile.marketcapRank > 0 && (
            <span className="text-[9px] text-txt-faint font-mono">#{profile.marketcapRank}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Price */}
        <div>
          <p className="text-lg font-bold font-mono text-txt-primary">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        {/* 24h Range bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider">24H Range</span>
          </div>
          <div className="relative h-1.5 bg-elevated rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: `${posPct}%`,
                background: `linear-gradient(90deg, #ff4444, #ff8800, #00ff88)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-txt-faint font-mono">${low.toLocaleString()}</span>
            <span className="text-[9px] text-txt-faint font-mono">${high.toLocaleString()}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Market Cap" value={profile.marketcap > 0 ? fmtUsd(profile.marketcap) : "—"} />
          <StatBox label="ATH" value={profile.ath > 0 ? `$${profile.ath.toLocaleString()}` : "—"} />
          <StatBox label="From ATH" value={profile.downFromATH} color="text-sell" />
          <StatBox label="24H High" value={`$${high.toLocaleString()}`} />
          <StatBox label="24H Low" value={`$${low.toLocaleString()}`} />
          <StatBox label="Spread" value={`${((parseFloat(ticker.askPx) - parseFloat(ticker.bidPx)) / price * 100).toFixed(3)}%`} />
        </div>
      </div>
    </Card>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-elevated/30 rounded-lg p-2">
      <p className="text-[9px] text-txt-faint uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-bold font-mono mt-0.5 ${color ?? "text-txt-primary"}`}>{value}</p>
    </div>
  );
}
