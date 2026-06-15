"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useSignalLog } from "@/lib/hooks/useSignalLog";
import DecisionScoreHero from "./DecisionScoreHero";
import LayerBreakdown from "./LayerBreakdown";
import SignalLogFeed from "./SignalLogFeed";
import WhyThisSignal from "./WhyThisSignal";

function normalizePair(pair: string): string {
  return pair.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
}

export default function DashboardGridLayout() {
  const d = useDashboard();
  const log = useSignalLog();

  const pairSignal = d.liveSignals.find((s) => normalizePair(s.pair) === normalizePair(d.selectedPair)) ?? null;
  const activeSignal = d.displaySignal ?? pairSignal ?? d.liveSignals[0] ?? null;

  function handleGenerate(): void {
    const coin = activeSignal?.pair?.split("/")[0] || d.selectedPair.split("/")[0] || "BTC";
    d.setAiCoin(coin);
    void d.generate(coin);
  }

  function handleExecute(): void {
    if (activeSignal && activeSignal.action !== "HOLD") {
      d.handleExecuteSignal(activeSignal);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-3 space-y-3">
      {/* Row 1: Decision Score + Layer Breakdown */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DecisionScoreHero
          signal={activeSignal}
          analyzing={d.analyzing}
          onGenerate={handleGenerate}
          onExecute={handleExecute}
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
  );
}
