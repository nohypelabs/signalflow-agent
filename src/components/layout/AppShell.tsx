"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MarketTickerTape from "@/components/MarketTickerTape";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface AppShellProps {
  children: React.ReactNode;
  // Header props
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
  latestSignal?: Signal | null;
  fullScreen?: boolean;
  hideHeader?: boolean;
}

export default function AppShell({
  children,
  sodexStatus,
  tickerCount,
  tickerMap,
  onTickerClick,
  latestSignal,
  fullScreen = false,
  hideHeader = false,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTape, setShowTape] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const tapeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    function handleScroll() {
      if (main!.scrollTop <= 2) {
        clearTimeout(tapeTimerRef.current);
        tapeTimerRef.current = setTimeout(() => setShowTape(true), 200);
      } else {
        clearTimeout(tapeTimerRef.current);
        setShowTape(false);
      }
    }

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      main.removeEventListener("scroll", handleScroll);
      clearTimeout(tapeTimerRef.current);
    };
  }, []);

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden">
      <Sidebar
        latestSignal={latestSignal}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
        onExpand={() => setSidebarCollapsed(false)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <AnimatePresence>
          {showTape && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden shrink-0"
            >
              <MarketTickerTape tickerMap={tickerMap} onTickerClick={onTickerClick} />
            </motion.div>
          )}
        </AnimatePresence>
        {!hideHeader && (
          <Header
            sodexStatus={sodexStatus}
            tickerCount={tickerCount}
            tickerMap={tickerMap}
            onTickerClick={onTickerClick}
            sidebarCollapsed={sidebarCollapsed}
            onExpandSidebar={() => setSidebarCollapsed(false)}
            onMenuClick={() => setMobileSidebarOpen(true)}
            latestSignal={latestSignal}
          />
        )}
        <main
          ref={mainRef}
          className={
            fullScreen
              ? "flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
              : "flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 relative"
          }
        >
          <div>
            {children}
          </div>
          <footer className="mx-4 mt-6 border-t border-white/10 py-6 lg:mx-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="glass-pill inline-flex items-center gap-2 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-semibold text-accent">SoSoValue Buildathon Wave 3 — 2026</span>
              </div>
              <p className="text-[11px] text-txt-secondary">
                <span className="text-txt-primary font-medium">SignalFlow Agent</span> — AI Signal Intelligence for Crypto Markets
              </p>
              <div className="flex items-center gap-4 text-[10px] text-txt-muted">
                <a href="https://github.com/nohypelabs/signalflow-agent" target="_blank" rel="noopener noreferrer"
                  className="glass-control inline-flex items-center gap-1.5 rounded-[35px] px-2.5 py-1 hover:text-txt-primary transition-colors">
                  <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                  GitHub
                </a>
                <a href="https://x.com/nohypelabs" target="_blank" rel="noopener noreferrer"
                  className="glass-control inline-flex items-center gap-1.5 rounded-[35px] px-2.5 py-1 hover:text-txt-primary transition-colors">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  X/@nohypelabs
                </a>
              </div>
              <p className="text-[10px] text-txt-muted/60">© 2026 NoHype Labs. All rights reserved.</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
