"use client";

import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import { useDashboard } from "@/lib/dashboard-context";
import PortfolioPage from "@/components/PortfolioPage";

export default function PortfolioRoute() {
  const paper = usePaperTrading();
  const d = useDashboard();

  // Build current prices map from context (simplified — reads from localStorage trades)
  const currentPrices = new Map<string, number>();

  return (
    <PortfolioPage
      trades={paper.trades}
      stats={paper.stats}
      balance={paper.balance}
      currentPrices={currentPrices}
      onClose={paper.closeTrade}
      onReset={paper.reset}
      signals={d.liveSignals}
    />
  );
}
