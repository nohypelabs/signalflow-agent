"use client";

import Header from "./Header";
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
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
  // Trade form
  tradeForm?: {
    signal: Signal | null;
    ticker: SoDEXTicker | null;
    walletConnected: boolean;
    walletAddress?: string;
    onExecute: (order: SoDEXNewOrderRequest) => Promise<void>;
    onClose: () => void;
  } | null;
  /** When true, main takes full remaining height with no padding/scroll — for trading terminal */
  fullScreen?: boolean;
  hideHeader?: boolean;
}

export default function AppShell({
  children,
  sodexStatus,
  tickerCount,
  tickerMap,
  onTickerClick,
  tradeForm,
  fullScreen = false,
  hideHeader = false,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-screen">
      {!hideHeader && (
        <Header
          sodexStatus={sodexStatus}
          tickerCount={tickerCount}
          tickerMap={tickerMap}
          onTickerClick={onTickerClick}
        />
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main
          className={
            fullScreen
              ? "flex-1 min-h-0 overflow-y-auto relative"
              : "flex-1 overflow-y-auto p-4 lg:p-6 relative"
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
              </div>
            </>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-txt-secondary py-4 border-t border-border-default mt-4 px-2">
            <div className="flex items-center gap-3">
              <span>SignalFlow Agent — Built by <span className="text-txt-primary">NoHype Labs</span></span>
              <span className="text-border-default">|</span>
              <span className="font-medium text-accent">SoSoValue Buildathon Wave 2 — 2026</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://github.com/nohypelabs/signalflow-agent" target="_blank" rel="noopener noreferrer" className="hover:text-txt-primary transition-colors">GitHub</a>
              <a href="https://x.com/nohypelabs" target="_blank" rel="noopener noreferrer" className="hover:text-txt-primary transition-colors">X/@nohypelabs</a>
              <span className="text-border-default">|</span>
              <span>NoHype Labs © 2026</span>
            </div>
          </footer>
        </main>
      </div>
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
