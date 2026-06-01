"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAIConfig } from "./hooks/useAIConfig";
import { useMarketProviderState } from "./dashboard/MarketProvider";
import { useSignalProviderState } from "./dashboard/SignalProvider";
import { useTradingProviderState } from "./dashboard/TradingProvider";
import { useWalletProviderState } from "./dashboard/WalletProvider";
import { useUIProviderState } from "./dashboard/UIProvider";
import { pairToSodexSymbol } from "./pair-map";
import type { DashboardState } from "./dashboard/types";

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { config: aiConfig, update: updateAIConfig } = useAIConfig();
  const trading = useTradingProviderState();
  const ui = useUIProviderState(trading.refreshOrders);
  const market = useMarketProviderState(ui.selectedPair);
  const wallet = useWalletProviderState();
  const signal = useSignalProviderState(aiConfig, market.tickers);
  const executingSodSym = ui.executingSignal ? pairToSodexSymbol(ui.executingSignal.pair) : "";
  const executingTicker = executingSodSym ? market.tickerMap.get(executingSodSym) ?? null : null;

  const value: DashboardState = {
    ...market,
    ...signal,
    ...wallet,
    ...trading,
    ...ui,
    executingTicker,
    aiConfig,
    updateAIConfig,
  };

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
