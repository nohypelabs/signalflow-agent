"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { LineChart } from "lucide-react";

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
          const json = await res.json();
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

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <LineChart size={14} className="text-info" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">Index Performance</h3>
          <Badge variant="info" size="sm">Live</Badge>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {data.map((idx) => {
          const isUp = idx.change24h >= 0;
          const label = INDICES.find((i) => i.ticker === idx.ticker)?.label ?? idx.ticker;

          return (
            <div key={idx.ticker} className="bg-elevated/30 rounded-lg p-3 border border-border-default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-txt-primary">{label}</span>
                <Badge variant={isUp ? "buy" : "sell"} size="sm">
                  {isUp ? "+" : ""}{idx.change24h.toFixed(2)}%
                </Badge>
              </div>
              <p className="text-sm font-bold font-mono text-txt-primary">
                ${idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
