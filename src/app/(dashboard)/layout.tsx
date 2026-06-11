"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import AppShell from "@/components/layout/AppShell";
import DynamicTitle from "@/components/DynamicTitle";
import SignalChatPopup from "@/components/ai/SignalChatPopup";

function ShellWithProps({ children }: { children: React.ReactNode }) {
  const d = useDashboard();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isFullScreen = pathname === "/trading" || isDashboard;
  const paper = usePaperTrading(d.isConnected ? d.address : undefined);

  return (
    <>
    <DynamicTitle />
    <AppShell
      sodexStatus={d.sodexStatus}
      tickerCount={d.tickers?.length}
      tickerMap={d.tickerMap}
      onTickerClick={(symbol) => {
        // symbol is display format like "BTC/USDC" from ticker tape
        d.setSelectedPair(symbol);
      }}
      latestSignal={d.liveSignals[0] ?? null}
      tradeForm={
        d.showTradeForm
          ? {
              signal: d.executingSignal,
              ticker: d.executingTicker,
              walletConnected: d.isConnected,
              walletAddress: d.address,
              onExecute: d.handleExecuteOrder,
              onClose: d.handleCloseForm,
              paperBalance: paper.balance?.total,
              paperAvailable: paper.balance?.available,
              onPaperTrade: (trade) => {
                paper.openTrade({
                  pair: trade.pair,
                  side: trade.side,
                  leverage: trade.leverage,
                  margin: trade.margin,
                  entryPrice: trade.entryPrice,
                  takeProfit: trade.takeProfit,
                  stopLoss: trade.stopLoss,
                });
              },
            }
          : null
      }
      fullScreen={isFullScreen}
    >
      {children}
    </AppShell>
    <SignalChatPopup />
    </>
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
