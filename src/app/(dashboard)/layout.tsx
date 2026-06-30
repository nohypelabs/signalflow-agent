"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import AppShell from "@/components/layout/AppShell";
import DynamicTitle from "@/components/DynamicTitle";
import SignalChatPopup from "@/components/ai/SignalChatPopup";

function ShellWithProps({ children }: { children: React.ReactNode }) {
  const d = useDashboard();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isSignals = pathname === "/signals";
  const isFullScreen = isDashboard || isSignals;

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
      latestSignal={(() => {
        const actionable = d.liveSignals.filter((s) => {
          const a = s.actionV2 ?? s.action;
          return a === "LONG" || a === "SHORT" || a === "STRONG_LONG" || a === "STRONG_SHORT" || a === "WEAK_LONG" || a === "WEAK_SHORT";
        });
        return actionable.length > 0
          ? actionable.reduce((best, s) => (s.confidence > best.confidence ? s : best), actionable[0])
          : (d.liveSignals[0] ?? null);
      })()}
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
