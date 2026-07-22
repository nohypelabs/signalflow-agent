"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion } from "framer-motion";
import AlertBell from "./AlertBell";
import TopSignalHighlight from "@/components/signals/TopSignalHighlight";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
  onMenuClick?: () => void;
  latestSignal?: Signal | null;
}

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  tickerMap,
  onTickerClick,
  sidebarCollapsed,
  onExpandSidebar,
  onMenuClick,
  latestSignal,
}: Props) {
  const tickerArray = tickerMap ? Array.from(tickerMap.values()) : null;
  const alerts = useAlerts(tickerArray);

  const topTicker = useMemo(() => {
    if (!latestSignal || !tickerMap) return undefined;
    const symbol = pairToSodexSymbol(latestSignal.pair);
    return symbol ? tickerMap.get(symbol) : undefined;
  }, [latestSignal, tickerMap]);

  return (
    <div className="shrink-0">
      <header className="topbar-glass relative mx-2 mt-1 rounded-[35px] px-4">

        {latestSignal ? (
          <div className="flex items-start gap-3 py-1.5">
            <div className="flex min-w-0 items-center gap-2.5 shrink-0 pt-1">
              <motion.button
                type="button"
                onClick={onMenuClick}
                whileTap={{ scale: 0.92 }}
                aria-label="Open sidebar"
                className="glass-control flex md:hidden cursor-pointer items-center justify-center overflow-hidden rounded-[35px] p-1"
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
                  className="glass-control hidden cursor-pointer items-center justify-center overflow-hidden rounded-[35px] p-1 md:flex"
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

            <div className="min-w-0 flex-1 [&>div]:!mb-0">
              <TopSignalHighlight
                signal={latestSignal}
                ticker={topTicker}
              />
            </div>

            <div className="flex items-start gap-2 shrink-0 pt-1">
              <AlertBell
                unreadCount={alerts.unreadCount}
                triggeredAlerts={alerts.triggeredAlerts}
                activeCount={alerts.activeAlerts.length}
                onRemove={alerts.removeAlert}
                onClearTriggered={alerts.clearTriggered}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-12 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 shrink-0">
              <motion.button
                type="button"
                onClick={onMenuClick}
                whileTap={{ scale: 0.92 }}
                aria-label="Open sidebar"
                className="glass-control flex md:hidden cursor-pointer items-center justify-center overflow-hidden rounded-[35px] p-1"
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
                  className="glass-control hidden cursor-pointer items-center justify-center overflow-hidden rounded-[35px] p-1 md:flex"
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

            <span className="text-xs text-txt-muted">Waiting for signal data...</span>

            <div className="flex items-center gap-2 shrink-0">
              <AlertBell
                unreadCount={alerts.unreadCount}
                triggeredAlerts={alerts.triggeredAlerts}
                activeCount={alerts.activeAlerts.length}
                onRemove={alerts.removeAlert}
                onClearTriggered={alerts.clearTriggered}
              />
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
