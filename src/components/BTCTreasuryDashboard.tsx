"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { Landmark } from "lucide-react";

interface BTCTreasury {
  ticker: string;
  name: string;
  list_location: string;
}

interface PurchaseHistory {
  date: string;
  ticker: string;
  btc_holding: number;
  btc_acq: number;
  acq_cost: number;
  avg_btc_cost: number;
}

export default function BTCTreasuryDashboard() {
  const [treasuries, setTreasuries] = useState<BTCTreasury[]>([]);
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch from the signals API which already aggregates this data
    fetch("/api/signals", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        // The signals API includes BTC treasury data
        setTreasuries(d.btcTreasuries ?? []);
        setHistory(d.purchaseHistory ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card-sm" className="h-14" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="table-row" className="h-8 mb-1" />
        ))}
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

  // Aggregate stats
  const totalBtc = history.reduce((s, h) => s + h.btc_holding, 0);
  const totalCost = history.reduce((s, h) => s + h.acq_cost, 0);
  const avgCost = totalBtc > 0 ? totalCost / totalBtc : 0;

  // Recent purchases
  const recentPurchases = history
    .filter((h) => h.btc_acq > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Landmark size={14} className="text-info" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">BTC Treasuries</h3>
          <Badge variant="info" size="sm">{treasuries.length} companies</Badge>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {history.length === 0 && (
          <div className="rounded-lg border border-hold-dim bg-hold-muted/20 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-hold">Holdings layer degraded</span>
              <Badge variant="hold" size="sm">SoSoValue</Badge>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-txt-secondary">
              Purchase history is unavailable right now. Showing company coverage when treasury metadata is available.
            </p>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-elevated/30 rounded-lg p-2">
            <p className="text-[9px] text-txt-faint uppercase tracking-wider">Total BTC Held</p>
            <p className="text-sm font-bold font-mono text-txt-primary mt-0.5">
              {totalBtc.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC
            </p>
          </div>
          <div className="bg-elevated/30 rounded-lg p-2">
            <p className="text-[9px] text-txt-faint uppercase tracking-wider">Total Cost</p>
            <p className="text-sm font-bold font-mono text-txt-primary mt-0.5">
              ${(totalCost / 1e9).toFixed(2)}B
            </p>
          </div>
          <div className="bg-elevated/30 rounded-lg p-2">
            <p className="text-[9px] text-txt-faint uppercase tracking-wider">Avg Cost/BTC</p>
            <p className="text-sm font-bold font-mono text-txt-primary mt-0.5">
              ${avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {history.length === 0 && treasuries.length > 0 && (
          <div>
            <p className="text-[9px] text-txt-muted uppercase tracking-wider mb-2">Tracked Companies</p>
            <div className="grid grid-cols-2 gap-2">
              {treasuries.slice(0, 6).map((company) => (
                <div key={company.ticker} className="rounded-lg bg-elevated/20 px-2 py-1.5">
                  <div className="text-[10px] font-semibold text-txt-primary">{company.ticker}</div>
                  <div className="truncate text-[9px] text-txt-muted">{company.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && treasuries.length === 0 && (
          <div className="rounded-lg border border-border-default bg-elevated/20 px-3 py-4 text-center">
            <p className="text-xs font-semibold text-txt-secondary">BTC treasury data unavailable</p>
            <p className="mt-1 text-[10px] leading-snug text-txt-muted">
              The dashboard keeps running from live SoDEX signals while the treasury module is degraded.
            </p>
          </div>
        )}

        {/* Recent purchases */}
        {recentPurchases.length > 0 && (
          <div>
            <p className="text-[9px] text-txt-muted uppercase tracking-wider mb-2">Recent Acquisitions</p>
            <div className="space-y-px">
              {recentPurchases.map((p, i) => (
                <div key={`${p.ticker}-${p.date}-${i}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-elevated/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-txt-faint">{p.date}</span>
                    <span className="text-[10px] font-semibold text-txt-primary">{p.ticker}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#00ff88]">
                      +{p.btc_acq.toFixed(1)} BTC
                    </span>
                    <span className="text-[10px] font-mono text-txt-faint">
                      ${(p.acq_cost / 1e6).toFixed(1)}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
