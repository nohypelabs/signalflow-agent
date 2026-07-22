"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Signal, SignalAction } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { LiveSignalDimensions } from "@/lib/types/signal";
import type { ActiveStrategySummary } from "@/lib/strategy/config";
import { pairToSodexSymbol } from "@/lib/pair-map";
import Skeleton from "@/components/ui/Skeleton";
import SignalsPageHeader from "./signals/SignalsPageHeader";
import SignalSummaryCards from "./signals/SignalSummaryCards";
import SignalFilters, { type SortOption, type ViewMode } from "./signals/SignalFilters";
import TopSignalHighlight from "./signals/TopSignalHighlight";
import SignalCard from "./signals/SignalCard";
import SignalCompactRow from "./signals/SignalCompactRow";
import SignalAnalysisDrawer from "./signals/SignalAnalysisDrawer";
import dynamic from "next/dynamic";
const TradingChart = dynamic(() => import("./TradingChart"), { ssr: false });

interface Props {
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
  liveDims?: Record<string, LiveSignalDimensions> | null;
  overallScores?: Record<string, number> | null;
  weights?: Record<string, Record<string, number>> | null;
  cappedDims?: Record<string, string[]> | null;
  activeStrategy?: ActiveStrategySummary | null;
  selectedPair: string;
  onSelectedPairChange: (pair: string) => void;
  selectedSignal: Signal | null;
  onSelectedSignalChange: (signal: Signal | null) => void;
  chartKlines?: import("@/lib/types/trade").SoDEXKline[] | null;
  tickerMap?: Map<string, SoDEXTicker>;
  aiSignal?: Signal | null;
}

export default function SignalsPage({
  tickers,
  liveSignals = [],
  liveDims,
  overallScores,
  weights,
  cappedDims,
  activeStrategy,
  selectedPair,
  onSelectedPairChange,
  selectedSignal,
  onSelectedSignalChange,
  chartKlines,
  tickerMap: externalTickerMap,
  aiSignal,
}: Props) {
  // ── Existing state ────────────────────────────────────
  // Build ticker map
  const signalTickerMap = useMemo(() => {
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
  const [evidenceAnalysisOpen, setEvidenceAnalysisOpen] = useState(false);

  // Filtered & sorted signals
  const filteredSignals = useMemo(() => {
    let result = [...liveSignals];

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
          const aChg = aSym ? (signalTickerMap.get(aSym)?.changePct ?? a.change24h) : a.change24h;
          const bChg = bSym ? (signalTickerMap.get(bSym)?.changePct ?? b.change24h) : b.change24h;
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
  }, [liveSignals, search, typeFilter, confidenceFilter, sortBy, signalTickerMap]);

  // Top signal (highest confidence)
  const topSignal = useMemo(() => {
    if (filteredSignals.length === 0) return null;
    return filteredSignals.reduce((best, s) => (s.confidence > best.confidence ? s : best), filteredSignals[0]);
  }, [filteredSignals]);

  const focusedSignal = useMemo(() => {
    if (selectedSignal && filteredSignals.some((signal) => signal.id === selectedSignal.id)) {
      return selectedSignal;
    }
    return topSignal;
  }, [filteredSignals, selectedSignal, topSignal]);

  const evidenceThesisLabel = useMemo(() => {
    if (!focusedSignal) return "Signal Thesis";
    if (focusedSignal.setup?.label) return `${focusedSignal.setup.label} Thesis`;

    const action = focusedSignal.actionV2 ?? focusedSignal.action;
    if (action.includes("LONG")) return "Long Thesis";
    if (action.includes("SHORT")) return "Short Thesis";
    return "Neutral Thesis";
  }, [focusedSignal]);

  useEffect(() => {
    setEvidenceAnalysisOpen(false);
  }, [focusedSignal?.id]);

  // Timestamp
  const lastUpdated = useMemo(() => {
    if (liveSignals.length === 0) return undefined;
    return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [liveSignals]);

  // Helper to get ticker for a signal
  const getTicker = (signal: Signal): SoDEXTicker | undefined => {
    const sym = pairToSodexSymbol(signal.pair);
    return sym ? signalTickerMap.get(sym) : undefined;
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

  const resetSignalFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setConfidenceFilter(0);
  };

  const focusSignal = useCallback((signal: Signal) => {
    onSelectedSignalChange(signal);
    onSelectedPairChange(signal.pair);
  }, [onSelectedPairChange, onSelectedSignalChange]);

  useEffect(() => {
    if (!focusedSignal) return;
    if (!selectedSignal || selectedSignal.id !== focusedSignal.id) {
      onSelectedSignalChange(focusedSignal);
    }
  }, [focusedSignal, onSelectedSignalChange, selectedSignal]);

  return (
    <>
      <div className="signals-glass-scope neu-scope signals-page-stack relative mx-auto mt-2 w-full max-w-[1180px] overflow-hidden px-3 py-3 sm:px-4 lg:mt-3 lg:py-5">
        <div className="glass-page-backdrop rounded-[35px] hidden" />
        <div className="relative z-10 space-y-4 lg:space-y-5">
        <SignalsPageHeader
          signalCount={filteredSignals.length}
          timestamp={lastUpdated}
        />

        {/* Active strategy policy */}
        {activeStrategy && (
          <div className="signals-glass-card flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 sm:px-4">
            <div className="flex-1 min-w-[220px]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-txt-dim">
                Active Strategy Policy
              </span>
              <span className="block text-xs font-semibold text-accent sm:inline sm:ml-2">
                {activeStrategy.label}
              </span>
            </div>
            <span className="glass-pill px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
              ≥{activeStrategy.minConfidence}% confidence
            </span>
            <span className="glass-pill px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
              {activeStrategy.maxPositionSize}% max position
            </span>
          </div>
        )}

        <div className="signals-glass-card px-4 py-3">
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Execution Window</p>
              <p className="mt-1 text-sm font-semibold text-txt-primary">Intraday setups are meant to open and close within the same trading day.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-txt-secondary">
                Treat these signals as 1H anchor setups with higher-timeframe confirmation. Ideal holding time is roughly
                {" "}1 to 8 hours. If price stalls past the session or the thesis invalidates, exit instead of converting it into a swing hold.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono lg:min-w-[260px]">
              <div className="glass-pill px-3 py-2 text-center">
                <p className="text-txt-faint">Primary</p>
                <p className="mt-1 text-txt-primary">1H</p>
              </div>
              <div className="glass-pill px-3 py-2 text-center">
                <p className="text-txt-faint">Hold</p>
                <p className="mt-1 text-txt-primary">1-8h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top signal highlight */}
        {topSignal && viewMode === "cards" && (() => {
          const { liveDims: coinDims, coinWeights, coinCapped } = getCoinData(topSignal);
          return (
            <TopSignalHighlight
              signal={topSignal}
              ticker={getTicker(topSignal)}
              liveDims={coinDims}
              weights={coinWeights}
              cappedDims={coinCapped}
              onFocusSignal={focusSignal}
            />
          );
        })()}

        {/* Summary cards */}
        {filteredSignals.length > 0 && <SignalSummaryCards signals={filteredSignals} />}

        {focusedSignal && (
          <section className="signals-glass-card overflow-hidden">
            <div className="border-b border-border-default px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                    Signal Evidence
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-txt-primary">{focusedSignal.pair}</span>
                    <span className={`rounded-[35px] px-2.5 py-1 text-[10px] font-bold ${
                      (focusedSignal.actionV2 ?? focusedSignal.action).includes("LONG")
                        ? "bg-buy/12 text-buy"
                        : (focusedSignal.actionV2 ?? focusedSignal.action).includes("SHORT")
                          ? "bg-sell/12 text-sell"
                          : "bg-hold/12 text-hold"
                    }`}>
                      {focusedSignal.actionV2 ?? focusedSignal.action}
                    </span>
                    <span className="glass-pill px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
                      {focusedSignal.confidence}% confidence
                    </span>
                    <span className="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
                      <span className="text-txt-faint">Entry</span>
                      <span className="text-txt-primary">{focusedSignal.execution?.entry ? focusedSignal.execution.entry.toFixed(2) : "N/A"}</span>
                    </span>
                    <span className="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
                      <span className="text-txt-faint">Target</span>
                      <span className="text-buy">{focusedSignal.execution?.takeProfit ? focusedSignal.execution.takeProfit.toFixed(2) : "N/A"}</span>
                    </span>
                    <span className="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
                      <span className="text-txt-faint">Risk</span>
                      <span className="text-sell">{focusedSignal.execution?.stopLoss ? focusedSignal.execution.stopLoss.toFixed(2) : "N/A"}</span>
                    </span>
                  </div>
                  <div className="mt-3 rounded-[28px] border border-white/10 bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(0,229,168,0.45)]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-txt-faint">
                          {evidenceThesisLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEvidenceAnalysisOpen(true)}
                        className="glass-control w-fit rounded-[35px] px-3 py-1.5 text-[10px] font-bold text-accent transition-all hover:text-txt-primary"
                      >
                        View Analysis
                      </button>
                    </div>
                    <p className="w-full text-left text-[12px] leading-6 text-txt-secondary md:columns-2 md:gap-6 md:text-justify">
                      {focusedSignal.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="signal-evidence-chart h-[520px]">
              <TradingChart
                klines={chartKlines}
                symbol={selectedPair || focusedSignal.pair}
                currentPrice={getTicker(focusedSignal) ? parseFloat(getTicker(focusedSignal)!.lastPx) : focusedSignal.price}
                liveSignals={filteredSignals}
                aiSignal={aiSignal ?? null}
                tickerMap={externalTickerMap}
                onPairChange={onSelectedPairChange}
                compact
              />
            </div>

            {evidenceAnalysisOpen && (() => {
              const { liveDims: coinDims, coinWeights, coinCapped } = getCoinData(focusedSignal);
              return (
                <SignalAnalysisDrawer
                  signal={focusedSignal}
                  liveDims={coinDims}
                  weights={coinWeights}
                  cappedDims={coinCapped}
                  onClose={() => setEvidenceAnalysisOpen(false)}
                />
              );
            })()}
          </section>
        )}

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

        {/* Signal grid / compact list */}
        {filteredSignals.length === 0 ? (
          <div className="space-y-3">
            {liveSignals.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="signals-glass-card p-5 space-y-3">
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
              <div className="signals-glass-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-hold">Signals are available</p>
                    <h3 className="mt-1 text-lg font-bold text-txt-primary">
                      Current filters have no matching intraday signal
                    </h3>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-txt-secondary">
                      SignalFlow is currently focused on same-day intraday setups. Reset the filters to review every live signal that still fits the current session.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetSignalFilters}
                      className="glass-control cursor-pointer rounded-[35px] px-3 py-2 text-xs font-semibold text-txt-secondary transition-colors hover:text-txt-primary"
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === "cards" ? (
          /* Cards view */
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                  tradingType={null}
                  onFocusSignal={focusSignal}
                />
              );
            })}
          </div>
        ) : (
          /* Compact view */
          <>
            <div className="hidden md:block space-y-1.5">
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
                    tradingType={null}
                    onFocusSignal={focusSignal}
                  />
                );
              })}
            </div>
            <div className="md:hidden grid grid-cols-1 gap-3">
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
                    tradingType={null}
                    onFocusSignal={focusSignal}
                  />
                );
              })}
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}
