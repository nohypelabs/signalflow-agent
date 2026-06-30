"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useSignalLog } from "@/lib/hooks/useSignalLog";
import MarketSelectorModal from "@/components/MarketSelectorModal";
import Skeleton from "@/components/ui/Skeleton";
import DecisionScoreHero from "./DecisionScoreHero";
import LayerBreakdown from "./LayerBreakdown";
import SignalLogFeed from "./SignalLogFeed";
import WhyThisSignal from "./WhyThisSignal";
import { pairToSodexSymbol } from "@/lib/pair-map";

function normalizePair(pair: string): string {
  return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
}

export default function DashboardGridLayout() {
  const d = useDashboard();
  const log = useSignalLog();
  const [marketSelectorOpen, setMarketSelectorOpen] = useState(false);

  const pairSignal = d.liveSignals.find((s) => normalizePair(s.pair) === normalizePair(d.selectedPair)) ?? null;
  const activeSignal = pairSignal ?? d.displaySignal ?? d.liveSignals[0] ?? null;
  const activePair = pairSignal?.pair ?? d.selectedPair;
  const activeTicker = useMemo(() => {
    const symbol = pairToSodexSymbol(activePair);
    return symbol ? d.tickerMap.get(symbol) : undefined;
  }, [activePair, d.tickerMap]);
  const activePrice = activeTicker ? Number.parseFloat(activeTicker.lastPx) : null;
  const activeChange = activeTicker ? Number(activeTicker.changePct) : null;
  const activePairMeta =
    activePrice !== null && Number.isFinite(activePrice)
      ? `$${activePrice.toLocaleString("en-US", {
          minimumFractionDigits: activePrice >= 100 ? 2 : 3,
          maximumFractionDigits: activePrice >= 100 ? 2 : 5,
        })}${activeChange !== null && Number.isFinite(activeChange) ? ` | ${activeChange >= 0 ? "+" : ""}${activeChange.toFixed(2)}%` : ""}`
      : "Waiting for live market";

  const initialLoading = d.signalsLoading && !activeSignal;

  function handleGenerate(): void {
    const coin = activePair.split("/")[0];
    d.setAiCoin(coin);
    void d.generate(coin);
  }

  return (
    <div className="neu-scope dashboard-grid relative mx-auto mt-2 w-full max-w-[1140px] overflow-x-hidden px-3 py-3 sm:px-4 lg:mt-3 lg:py-5">
      <MarketSelectorModal
        isOpen={marketSelectorOpen}
        onClose={() => setMarketSelectorOpen(false)}
        onSelectMarket={(pair) => {
          d.setSelectedPair(pair);
          d.setSelectedSignal(null);
        }}
        currentSymbol={activePair}
        tickerMap={d.tickerMap}
        liveSignals={d.liveSignals}
      />

      {/* Bento Grid */}
      <div className="dashboard-grid-stack relative z-10 space-y-3.5 lg:space-y-4">
        {/* Row 1: Decision Score + Layer Breakdown */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:gap-4">
          {initialLoading ? (
            <>
              <div className="neu-card rounded-[35px] overflow-hidden">
                <div className="border-b border-border-default px-4 py-3">
                  <Skeleton variant="text-sm" className="w-28" />
                  <Skeleton variant="text" className="w-44 mt-1" />
                </div>
                <div className="p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
                    <div className="space-y-4">
                      <Skeleton variant="card-sm" className="w-48 rounded-[35px] h-9" />
                      <div className="space-y-2">
                        <Skeleton variant="text-sm" className="w-20" />
                        <Skeleton variant="card" className="w-56 h-9 rounded-lg" />
                        <Skeleton variant="text" className="w-64" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:max-w-[360px]">
                        <div className="neu-card rounded-[35px] p-3 text-center space-y-2">
                          <Skeleton variant="text-sm" className="w-10 mx-auto" />
                          <Skeleton variant="text-sm" className="w-14 mx-auto" />
                        </div>
                        <div className="neu-card rounded-[35px] p-3 text-center space-y-2">
                          <Skeleton variant="text-sm" className="w-10 mx-auto" />
                          <Skeleton variant="text-sm" className="w-14 mx-auto" />
                        </div>
                      </div>
                      <Skeleton variant="card" className="w-full sm:w-[190px] h-11 rounded-[35px]" />
                    </div>
                    <div className="neu-card rounded-[35px] h-full min-h-[200px] p-5 flex flex-col items-center justify-center space-y-3">
                      <Skeleton variant="text-sm" className="w-16" />
                      <Skeleton variant="circle" className="w-28 h-28" />
                      <Skeleton variant="text-sm" className="w-12" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="neu-card rounded-[35px] overflow-hidden">
                <div className="border-b border-border-default px-4 py-3">
                  <Skeleton variant="text-sm" className="w-24" />
                  <Skeleton variant="text" className="w-44 mt-1" />
                </div>
                <div className="divide-y divide-white/10">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <Skeleton variant="circle" className="w-3.5 h-3.5 shrink-0" />
                      <Skeleton variant="text" className="flex-1" />
                      <Skeleton variant="text-sm" className="w-12" />
                      <Skeleton variant="card" className="w-20 h-1.5 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <DecisionScoreHero
                signal={activeSignal}
                analyzing={d.analyzing}
                onGenerate={handleGenerate}
                selectedPair={activePair}
                selectedPairMeta={activePairMeta}
                onOpenMarketSelector={() => setMarketSelectorOpen(true)}
              />
              <LayerBreakdown
                signal={activeSignal}
                sourceFlags={d.signalsData?.sources}
              />
            </>
          )}
        </div>

        {/* Row 2: Log Feed — full width */}
        {initialLoading ? (
          <div className="neu-card rounded-[35px] overflow-hidden">
            <div className="border-b border-border-default px-4 py-3">
              <Skeleton variant="text-sm" className="w-20" />
              <Skeleton variant="text" className="w-36 mt-1" />
            </div>
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton variant="circle" className="w-2 h-2 shrink-0" />
                  <Skeleton variant="text-sm" className="w-16 shrink-0" />
                  <Skeleton variant="text" className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SignalLogFeed
            entries={log.entries}
            status={log.status}
            filter={log.filter}
            onFilterChange={log.setFilter}
          />
        )}

        {/* Row 3: Why This Signal — full width */}
        {initialLoading ? (
          <div className="neu-card rounded-[35px] overflow-hidden">
            <div className="border-b border-border-default px-4 py-3">
              <Skeleton variant="text-sm" className="w-28" />
              <Skeleton variant="text" className="w-44 mt-1" />
            </div>
            <div className="px-4 py-3 border-b border-border-default/50 space-y-2">
              <div className="flex items-start gap-2">
                <Skeleton variant="circle" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="w-full" />
                  <Skeleton variant="text" className="w-3/4" />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <Skeleton variant="text-sm" className="w-20" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton variant="circle" className="w-3 h-3 shrink-0" />
                  <Skeleton variant="text" className="flex-1" />
                  <Skeleton variant="text-sm" className="w-8" />
                  <Skeleton variant="card" className="w-16 h-1 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <WhyThisSignal signal={activeSignal} />
        )}
      </div>
    </div>
  );
}
