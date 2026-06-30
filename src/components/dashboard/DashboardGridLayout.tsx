"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useSignalLog } from "@/lib/hooks/useSignalLog";
import MarketSelectorModal from "@/components/MarketSelectorModal";
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
        </div>

        {/* Row 2: Log Feed — full width */}
        <SignalLogFeed
          entries={log.entries}
          status={log.status}
          filter={log.filter}
          onFilterChange={log.setFilter}
        />

        {/* Row 3: Why This Signal — full width */}
        <WhyThisSignal signal={activeSignal} />
      </div>
    </div>
  );
}
