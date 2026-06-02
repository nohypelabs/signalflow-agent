"use client";

import { useEffect, useMemo } from "react";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import { useDashboard } from "@/lib/dashboard-context";
import PortfolioPage from "@/components/PortfolioPage";

export default function PortfolioRoute() {
  const paper = usePaperTrading();
  const d = useDashboard();
  const checkPaperTpSl = paper.checkTpSl;

  const currentPrices = useMemo(() => {
    const prices = new Map<string, number>();
    for (const ticker of d.tickers ?? []) {
      const price = parseFloat(ticker.lastPx);
      if (!Number.isFinite(price) || price <= 0) continue;
      const [rawBase, rawQuote] = ticker.symbol.split("_");
      const base = rawBase?.replace(/^v/, "");
      const quote = rawQuote?.replace(/^v/, "");
      if (!base) continue;
      prices.set(base, price);
      if (quote) prices.set(`${base}/${quote}`, price);
    }
    return prices;
  }, [d.tickers]);

  useEffect(() => {
    if (currentPrices.size > 0) checkPaperTpSl(currentPrices);
  }, [currentPrices, checkPaperTpSl]);

  return (
    <PortfolioPage
      trades={paper.trades}
      stats={paper.stats}
      balance={paper.balance}
      isWalletConnected={d.isConnected}
      isCapitalConfigured={paper.capitalConfigured}
      currentPrices={currentPrices}
      onClose={paper.closeTrade}
      onReset={paper.reset}
      onConfigureCapital={paper.configureCapital}
      signals={d.liveSignals}
    />
  );
}
