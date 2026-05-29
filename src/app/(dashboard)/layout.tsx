"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import AppShell from "@/components/layout/AppShell";
import { pairToSodexSymbol } from "@/lib/pair-map";

function ShellWithProps({ children }: { children: React.ReactNode }) {
  const d = useDashboard();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isFullScreen = pathname === "/trading" || isDashboard;

  return (
    <AppShell
      sodexStatus={d.sodexStatus}
      tickerCount={d.tickers?.length}
      tickerMap={d.tickerMap}
      selectedPair={d.selectedPairDisplay}
      onTickerClick={(symbol) => {
        // symbol is display format like "BTC/USDC" from ticker tape
        d.setSelectedPair(symbol);
      }}
      tradeForm={
        d.showTradeForm
          ? {
              signal: d.executingSignal,
              ticker: d.executingTicker,
              walletConnected: d.isConnected,
              walletAddress: d.address,
              onExecute: d.handleExecuteOrder,
              onClose: d.handleCloseForm,
            }
          : null
      }
      fullScreen={isFullScreen}
    >
      {children}
    </AppShell>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <ShellWithProps>{children}</ShellWithProps>
    </DashboardProvider>
  );
}
