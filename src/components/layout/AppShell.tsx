"use client";

import Header from "./Header";
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
    paperMode?: boolean;
    paperBalance?: number;
    paperAvailable?: number;
    onPaperTrade?: (trade: { pair: string; side: 'LONG' | 'SHORT'; leverage: number; margin: number; entryPrice: number; takeProfit: number; stopLoss: number }) => void;
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
          <footer className="mt-6 border-t border-border-default py-6">
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Buildathon badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-muted/40 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-semibold text-accent">SoSoValue Buildathon Wave 2 — 2026</span>
              </div>
              {/* Brand */}
              <p className="text-[11px] text-txt-secondary">
                <span className="text-txt-primary font-medium">SignalFlow Agent</span> — AI-Powered Signal-to-Execution Dashboard
              </p>
              {/* Links */}
              <div className="flex items-center gap-4 text-[10px] text-txt-muted">
                <a href="https://github.com/nohypelabs/signalflow-agent" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1 hover:text-txt-primary hover:border-border-muted transition-colors">
                  <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                  GitHub
                </a>
                <a href="https://x.com/nohypelabs" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1 hover:text-txt-primary hover:border-border-muted transition-colors">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  X/@nohypelabs
                </a>
              </div>
              {/* Copyright */}
              <p className="text-[10px] text-txt-muted/60">© 2026 NoHype Labs. All rights reserved.</p>
            </div>
          </footer>
        </main>
      </div>
      {tradeForm && (
        <TradeForm
          signal={tradeForm.signal}
          ticker={tradeForm.ticker}
          walletConnected={tradeForm.walletConnected}
          walletAddress={tradeForm.walletAddress}
          onExecute={tradeForm.onExecute}
          onClose={tradeForm.onClose}
          paperMode={tradeForm.paperMode}
          paperBalance={tradeForm.paperBalance}
          paperAvailable={tradeForm.paperAvailable}
          onPaperTrade={tradeForm.onPaperTrade}
        />
      )}
    </div>
  );
}
