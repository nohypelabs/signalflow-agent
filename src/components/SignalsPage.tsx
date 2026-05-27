"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Signal, SignalAction } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import { loadTradingType, saveTradingType, TRADING_TYPES } from "@/lib/types/trading-type";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import SignalsPageHeader from "./signals/SignalsPageHeader";
import SignalSummaryCards from "./signals/SignalSummaryCards";
import SignalFilters, { type SortOption, type ViewMode } from "./signals/SignalFilters";
import TopSignalHighlight from "./signals/TopSignalHighlight";
import SignalCard from "./signals/SignalCard";
import SignalCompactRow from "./signals/SignalCompactRow";
import TraderTypeModal from "@/components/TraderTypeModal";

interface Props {
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
  liveDims?: Record<string, LiveSignalDimensions> | null;
  overallScores?: Record<string, number> | null;
  weights?: Record<string, Record<string, number>> | null;
  cappedDims?: Record<string, string[]> | null;
}

export default function SignalsPage({ tickers, liveSignals = [], liveDims, overallScores, weights, cappedDims }: Props) {
  // ── Trader Type State ──────────────────────────────────
  const [tradingType, setTradingType] = useState<TradingType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalChecked, setModalChecked] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const saved = loadTradingType();
    if (saved) {
      setTradingType(saved);
    } else {
      setShowModal(true);
    }
    setModalChecked(true);
  }, []);

  // Listen for reopen modal event
  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener("reopen-trader-type-modal", handler);
    return () => window.removeEventListener("reopen-trader-type-modal", handler);
  }, []);

  const handleTypeSelect = useCallback((type: TradingType) => {
    setTradingType(type);
    setShowModal(false);
  }, []);

  const handleTypeChange = useCallback((type: TradingType | null) => {
    setTradingType(type);
  }, []);

  const handleSkipModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // ── Existing state ────────────────────────────────────
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

  // ── Filter signals by trading type ────────────────────
  const typeFilteredSignals = useMemo(() => {
    if (!tradingType) return liveSignals; // No type selected = show all

    const config = TRADING_TYPES[tradingType];
    // Filter by minimum confidence for the selected type
    return liveSignals.filter((s) => s.confidence >= config.minConfidence);
  }, [liveSignals, tradingType]);

  // Filtered & sorted signals
  const filteredSignals = useMemo(() => {
    let result = [...typeFilteredSignals];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.pair.toLowerCase().includes(q));
    }

    // Type filter (LONG/SHORT/HOLD)
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
  }, [typeFilteredSignals, search, typeFilter, confidenceFilter, sortBy, tickerMap]);

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

  // Don't render until we've checked for saved type
  if (!modalChecked) {
    return (
      <div className="space-y-5">
        <div className="h-16" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border-default rounded-xl p-5 space-y-3">
              <Skeleton variant="text" className="w-24" />
              <Skeleton variant="text" className="w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Modal */}
      {showModal && (
        <TraderTypeModal
          onSelect={handleTypeSelect}
          onSkip={handleSkipModal}
        />
      )}

      <div className="space-y-5">
        {/* Page header with type switcher */}
        <SignalsPageHeader
          signalCount={filteredSignals.length}
          timestamp={lastUpdated}
          currentType={tradingType}
          onTypeChange={handleTypeChange}
        />

        {/* Active type indicator */}
        {tradingType && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
            style={{
              borderColor: `${TRADING_TYPES[tradingType].color}25`,
              backgroundColor: `${TRADING_TYPES[tradingType].color}08`,
            }}
          >
            <span className="text-lg">{TRADING_TYPES[tradingType].icon}</span>
            <div className="flex-1">
              <span className="text-xs font-semibold" style={{ color: TRADING_TYPES[tradingType].color }}>
                {TRADING_TYPES[tradingType].label} Mode
              </span>
              <span className="text-[10px] text-txt-dim ml-2">
                Showing signals with ≥{TRADING_TYPES[tradingType].minConfidence}% confidence
              </span>
            </div>
            <span className="text-[10px] text-txt-faint font-mono">
              {TRADING_TYPES[tradingType].timeframe}
            </span>
          </div>
        )}

        {/* Summary cards */}
        {filteredSignals.length > 0 && <SignalSummaryCards signals={filteredSignals} />}

        {/* Filters */}
        {filteredSignals.length > 0 && (
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
          <TopSignalHighlight signal={topSignal} ticker={getTicker(topSignal)} tradingType={tradingType} />
        )}

        {/* Signal grid / compact list */}
        {filteredSignals.length === 0 ? (
          <div className="space-y-3">
            {liveSignals.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
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
              ))
            ) : (
              <EmptyState
                title={tradingType
                  ? `No ${TRADING_TYPES[tradingType].label} signals right now`
                  : "No signals match your filters"
                }
                description={tradingType
                  ? `Signals need ≥${TRADING_TYPES[tradingType].minConfidence}% confidence for ${TRADING_TYPES[tradingType].label} style. Try switching to a different type or adjusting filters.`
                  : "Try adjusting the search, type, or confidence filters to see more signals."
                }
                icon="signal"
              />
            )}
          </div>
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
                  tradingType={tradingType}
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
    </>
  );
}
