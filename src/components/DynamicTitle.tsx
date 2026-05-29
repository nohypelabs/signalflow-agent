"use client";

import { useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol, sodexSymbolToBase } from "@/lib/pair-map";

function formatPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

export default function DynamicTitle() {
  const { selectedPairDisplay, tickerMap } = useDashboard();

  useEffect(() => {
    const sodexSym = pairToSodexSymbol(selectedPairDisplay);
    const ticker = sodexSym ? tickerMap.get(sodexSym) : undefined;

    if (!ticker) {
      document.title = `${selectedPairDisplay} — SignalFlow`;
      return;
    }

    const price = parseFloat(ticker.lastPx);
    const isUp = ticker.changePct >= 0;
    const arrow = isUp ? "▲" : "▼";
    const sign = isUp ? "+" : "";

    if (Number.isFinite(price) && price > 0) {
      document.title = `${selectedPairDisplay} ${formatPrice(price)} ${arrow}${sign}${ticker.changePct.toFixed(2)}% — SignalFlow`;
    } else {
      document.title = `${selectedPairDisplay} — SignalFlow`;
    }
  }, [selectedPairDisplay, tickerMap]);

  return null;
}
