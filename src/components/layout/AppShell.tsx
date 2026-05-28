"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import DashboardIntroGate from "./DashboardIntroGate";
import TradeForm from "@/components/TradeForm";
import { AmbientGrid } from "@/components/ui/Polish";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker, SoDEXNewOrderRequest } from "@/lib/sodex-types";

interface AppShellProps {
  children: React.ReactNode;
  // Header props
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  btcPrice?: string;
  btcChange?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  // Trade form
  tradeForm?: {
    signal: Signal | null;
    ticker: SoDEXTicker | null;
    walletConnected: boolean;
    walletAddress?: string;
    onExecute: (order: SoDEXNewOrderRequest) => Promise<void>;
    onClose: () => void;
  } | null;
  /** When true, main takes full remaining height with no padding/scroll/footer — for trading terminal */
  fullScreen?: boolean;
}

export default function AppShell({
  children,
  sodexStatus,
  tickerCount,
  btcPrice,
  btcChange,
  tickerMap,
  tradeForm,
  fullScreen = false,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <Header
        sodexStatus={sodexStatus}
        tickerCount={tickerCount}
        btcPrice={btcPrice}
        btcChange={btcChange}
        tickerMap={tickerMap}
        onMenuToggle={() => setMobileMenuOpen(true)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main
          className={
            fullScreen
              ? "flex-1 min-h-0 overflow-y-auto relative"
              : "flex-1 overflow-y-auto p-4 lg:p-6 pb-20 md:pb-0 relative"
          }
        >
          {fullScreen ? (
            /* Full-screen mode: no padding, no footer, no scroll — trading terminal */
            children
          ) : (
            <>
              <AmbientGrid opacity={0.025} size={28} />
              <div className="relative z-10">
                {children}
                <footer className="text-center text-[11px] text-txt-dim py-4 border-t border-border-default mt-4">
                  <p>SignalFlow Agent — Built by <span className="text-txt-muted">NoHype Labs</span></p>
                  <p className="mt-0.5 text-txt-faint">SoSoValue Buildathon 2026 — Wave 2</p>
                </footer>
              </div>
            </>
          )}
        </main>
      </div>
      <MobileBottomNav />
      <DashboardIntroGate />
      {tradeForm && (
        <TradeForm
          signal={tradeForm.signal}
          ticker={tradeForm.ticker}
          walletConnected={tradeForm.walletConnected}
          walletAddress={tradeForm.walletAddress}
          onExecute={tradeForm.onExecute}
          onClose={tradeForm.onClose}
        />
      )}
    </div>
  );
}
