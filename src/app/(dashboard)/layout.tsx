"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import AppShell from "@/components/layout/AppShell";

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
      btcPrice={(() => {
        const t = d.tickerMap.get("vBTC_vUSDC");
        return t
          ? `$${parseFloat(t.lastPx).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : undefined;
      })()}
      btcChange={(() => {
        const t = d.tickerMap.get("vBTC_vUSDC");
        if (!t) return undefined;
        const pct = t.changePct;
        return typeof pct === "number" && !Number.isNaN(pct) ? pct : undefined;
      })()}
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
