"use client";

import { useMemo, useState } from "react";
import { useScreener } from "@/lib/hooks/useScreener";
import type { ScreenerPair } from "@/lib/api/screener";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { BarChart3 } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "index", label: "Indices" },
  { value: "stock", label: "Stocks" },
  { value: "commodity", label: "Commodities" },
];

type SortKey = "volume" | "change" | "price" | "marketcap";


export default function ScreenerTable() {
  const { data, total, loading, error, filters, setFilters } = useScreener();
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = sortKey === "volume" ? a.quoteVolume24h : sortKey === "change" ? a.change24h : sortKey === "marketcap" ? a.marketcap : a.price;
      const bv = sortKey === "volume" ? b.quoteVolume24h : sortKey === "change" ? b.change24h : sortKey === "marketcap" ? b.marketcap : b.price;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-accent" />
            <h3 className="text-sm font-semibold text-txt-primary">Pair Screener</h3>
            <Badge variant="accent" size="sm">{total} pairs</Badge>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilters({ category: c.value })}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                filters.category === c.value
                  ? "bg-accent-muted text-accent border border-accent-dim"
                  : "bg-elevated/30 text-txt-secondary border border-border-default hover:border-border-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_90px_70px] gap-2 px-3 py-2 border-b border-border-default">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Pair</span>
          <button onClick={() => handleSort("price")} className="text-[9px] text-txt-faint uppercase tracking-wider hover:text-txt-secondary transition-colors text-right">Price{sortKey === "price" ? (sortDir === "desc" ? " ↓" : " ↑") : ""}</button>
          <button onClick={() => handleSort("change")} className="text-[9px] text-txt-faint uppercase tracking-wider hover:text-txt-secondary transition-colors text-right">24H %{sortKey === "change" ? (sortDir === "desc" ? " ↓" : " ↑") : ""}</button>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="table-row" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3">
            <p className="text-xs text-sell">{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-3">
            <p className="text-xs text-txt-muted text-center">No pairs match filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default max-h-[600px] overflow-y-auto">
            {sorted.map((p) => (
              <ScreenerRow key={p.symbol} pair={p} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ScreenerRow({ pair: p }: { pair: ScreenerPair }) {
  const isUp = p.change24h >= 0;

  return (
    <div className="grid grid-cols-[1fr_90px_70px] gap-2 px-3 py-2 hover:bg-elevated/40 transition-colors items-center cursor-pointer">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold text-txt-primary truncate">{p.baseCoin}</span>
        <span className={`text-[7px] px-1 py-0.5 rounded shrink-0 ${
          p.category === "crypto" ? "bg-accent-muted/50 text-accent" :
          p.category === "index" ? "bg-hold-muted/50 text-hold" :
          p.category === "stock" ? "bg-buy-muted/50 text-buy" :
          "bg-elevated text-txt-faint"
        }`}>
          {p.category}
        </span>
      </div>
      <span className="text-[11px] font-mono text-txt-primary text-right">
        ${p.price >= 1000 ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.price.toFixed(2)}
      </span>
      <span className={`text-[11px] font-mono font-medium text-right ${isUp ? "text-buy" : "text-sell"}`}>
        {isUp ? "+" : ""}{p.change24h.toFixed(2)}%
      </span>
    </div>
  );
}
