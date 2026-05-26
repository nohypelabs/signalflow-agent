"use client";

import { useState, useMemo } from "react";
import type { Signal, SignalAction } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import SignalsPageHeader from "./signals/SignalsPageHeader";
import SignalSummaryCards from "./signals/SignalSummaryCards";
import SignalFilters, { type SortOption, type ViewMode } from "./signals/SignalFilters";
import TopSignalHighlight from "./signals/TopSignalHighlight";
import SignalCard from "./signals/SignalCard";
import SignalCompactRow from "./signals/SignalCompactRow";

interface Props {
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
  liveDims?: Record<string, LiveSignalDimensions> | null;
  overallScores?: Record<string, number> | null;
  weights?: Record<string, Record<string, number>> | null;
  cappedDims?: Record<string, string[]> | null;
}

export default function SignalsPage({ tickers, liveSignals = [], liveDims, overallScores, weights, cappedDims }: Props) {
  // Build ticker map
  const tickerMap = useMemo(() => {
    const map = new Map<string, SoDEXTicker>();
    if (tickers) tickers.forEach((t) => map.set(t.symbol, t));
    return map;
  }, [tickers]);

  // Filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SignalAction | "ALL">("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("confidence");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Filtered & sorted signals
  const filteredSignals = useMemo(() => {
    let result = [...liveSignals];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.pair.toLowerCase().includes(q));
    }

    // Type filter
    if (typeFilter !== "ALL") {
      result = result.filter((s) => s.action === typeFilter);
    }

    // Confidence filter
    if (confidenceFilter > 0) {
      result = result.filter((s) => s.confidence >= confidenceFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "confidence":
          return b.confidence - a.confidence;
        case "change": {
          const aSym = pairToSodexSymbol(a.pair);
          const bSym = pairToSodexSymbol(b.pair);
          const aChg = aSym ? (tickerMap.get(aSym)?.changePct ?? a.change24h) : a.change24h;
          const bChg = bSym ? (tickerMap.get(bSym)?.changePct ?? b.change24h) : b.change24h;
          return bChg - aChg;
        }
        case "newest":
          return 0; // signals don't have timestamp, preserve order
        case "pair":
          return a.pair.localeCompare(b.pair);
        default:
          return 0;
      }
    });

    return result;
  }, [liveSignals, search, typeFilter, confidenceFilter, sortBy, tickerMap]);

  // Top signal (highest confidence)
  const topSignal = useMemo(() => {
    if (filteredSignals.length === 0) return null;
    return filteredSignals.reduce((best, s) => (s.confidence > best.confidence ? s : best), filteredSignals[0]);
  }, [filteredSignals]);

  // Timestamp
  const lastUpdated = useMemo(() => {
    if (liveSignals.length === 0) return undefined;
    return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [liveSignals]);

  // Helper to get ticker for a signal
  const getTicker = (signal: Signal): SoDEXTicker | undefined => {
    const sym = pairToSodexSymbol(signal.pair);
    return sym ? tickerMap.get(sym) : undefined;
  };

  // Helper to get coin-level data
  const getCoinData = (signal: Signal) => {
    const coin = signal.pair.split("/")[0];
    return {
      liveDims: liveDims?.[coin] ?? null,
      overallScore: overallScores?.[coin] ?? null,
      coinWeights: weights?.[coin] ?? null,
      coinCapped: cappedDims?.[coin] ?? null,
    };
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <SignalsPageHeader signalCount={liveSignals.length} timestamp={lastUpdated} />

      {/* Summary cards */}
      {liveSignals.length > 0 && <SignalSummaryCards signals={liveSignals} />}

      {/* Filters */}
      {liveSignals.length > 0 && (
        <SignalFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          confidenceFilter={confidenceFilter}
          onConfidenceFilterChange={setConfidenceFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Top signal highlight */}
      {topSignal && viewMode === "cards" && (
        <TopSignalHighlight signal={topSignal} ticker={getTicker(topSignal)} />
      )}

      {/* Signal grid / compact list */}
      {liveSignals.length === 0 ? (
        <div className="space-y-3">
          {/* Loading skeleton */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border-default rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-24" />
                <Skeleton variant="text-sm" className="w-16" />
              </div>
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-3/4" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} variant="table-row" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredSignals.length === 0 ? (
        <EmptyState
          title="No signals match your filters"
          description="Try adjusting the search, type, or confidence filters to see more signals."
          icon="signal"
        />
      ) : viewMode === "cards" ? (
        /* Cards view */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredSignals.map((s) => {
            const { liveDims: coinDims, overallScore, coinWeights, coinCapped } = getCoinData(s);
            return (
              <SignalCard
                key={s.id}
                signal={s}
                ticker={getTicker(s)}
                liveDims={coinDims}
                overallScore={overallScore}
                weights={coinWeights}
                cappedDims={coinCapped}
              />
            );
          })}
        </div>
      ) : (
        /* Compact view */
        <div className="space-y-1.5">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-2 text-[9px] text-txt-dim uppercase tracking-wider font-semibold">
            <span>Pair</span>
            <span>Confidence</span>
            <span>Price</span>
            <span>24H</span>
            <span>Score</span>
            <span>Updated</span>
            <span>Action</span>
          </div>
          {filteredSignals.map((s) => {
            const { liveDims: coinDims, overallScore, coinWeights, coinCapped } = getCoinData(s);
            return (
              <SignalCompactRow
                key={s.id}
                signal={s}
                ticker={getTicker(s)}
                liveDims={coinDims}
                overallScore={overallScore}
                weights={coinWeights}
                cappedDims={coinCapped}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
