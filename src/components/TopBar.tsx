"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import AlertBell from "./AlertBell";
import MarketTickerTape from "./MarketTickerTape";
import { useAlerts } from "@/lib/hooks/useAlerts";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
  onMenuClick?: () => void;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  tickerMap,
  onTickerClick,
  sidebarCollapsed,
  onExpandSidebar,
  onMenuClick,
}: Props) {
  const tickerArray = tickerMap ? Array.from(tickerMap.values()) : null;
  const alerts = useAlerts(tickerArray);

  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="shrink-0">
      {/* Mobile: scrolling market tape */}
      <div className="lg:hidden">
        <MarketTickerTape tickerMap={tickerMap} onTickerClick={onTickerClick} />
      </div>

      {/* Main header bar */}
      <header className="relative flex items-center justify-between gap-3 px-4 h-12 bg-surface border-b border-border-default">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        {/* Left: logo button — visible on mobile (drawer) or desktop collapsed (expand) */}
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Mobile: always show logo as drawer trigger */}
          <motion.button
            type="button"
            onClick={onMenuClick}
            whileTap={{ scale: 0.92 }}
            aria-label="Open sidebar"
            className="flex md:hidden cursor-pointer items-center justify-center rounded-lg overflow-hidden"
          >
            <Image
              src="/icons/signalflow-logo.png"
              alt="SignalFlow"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </motion.button>
          {/* Desktop: show logo only when sidebar collapsed */}
          {sidebarCollapsed && (
            <motion.button
              type="button"
              onClick={onExpandSidebar}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              aria-label="Expand sidebar"
              className="hidden md:flex cursor-pointer items-center justify-center rounded-lg overflow-hidden"
            >
              <Image
                src="/icons/signalflow-logo.png"
                alt="SignalFlow"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </motion.button>
          )}
        </div>

        {/* Center: scrolling ticker tape (desktop) */}
        <div
          className="relative hidden lg:flex flex-1 min-w-0 mx-3 overflow-hidden rounded-md bg-[#060810]"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
          }}
        >
          <MarketTickerTape tickerMap={tickerMap} embedded onTickerClick={onTickerClick} />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface/80 to-transparent" />
        </div>

        {/* Right: meta + alerts */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5 shrink-0">
          {tickerCount !== undefined && tickerCount > 0 && (
            <span className="hidden xl:inline-flex text-[10px] font-mono font-semibold text-txt-muted">
              {tickerCount} PAIRS
            </span>
          )}
          <span
            className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-txt-muted"
            suppressHydrationWarning
          >
            {timeStr}
            <span className="text-txt-dim">UTC+7</span>
          </span>
          <AlertBell
            unreadCount={alerts.unreadCount}
            triggeredAlerts={alerts.triggeredAlerts}
            activeCount={alerts.activeAlerts.length}
            onRemove={alerts.removeAlert}
            onClearTriggered={alerts.clearTriggered}
          />
        </div>
      </header>
    </div>
  );
}
