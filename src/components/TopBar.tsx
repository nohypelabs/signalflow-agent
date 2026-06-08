"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import WalletButton from "./WalletButton";
import AlertBell from "./AlertBell";
import MarketTickerTape from "./MarketTickerTape";
import { useAlerts } from "@/lib/hooks/useAlerts";
import {
  SettingsIcon,
  CloseIcon,
} from "@/components/ui/icons";
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

const systemItems = [
  { href: "/settings", label: "Settings", Icon: SettingsIcon, description: "Preferences & configuration" },
];

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  tickerMap,
  onTickerClick,
  sidebarCollapsed,
  onExpandSidebar,
  onMenuClick,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const tickerArray = tickerMap ? Array.from(tickerMap.values()) : null;
  const alerts = useAlerts(tickerArray);

  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  useEffect(() => {
    systemItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  useEffect(() => {
    setSettingsOpen(false);
  }, [pathname]);

  const navigate = (href: string) => {
    router.push(href);
    setSettingsOpen(false);
  };

  const isSystemActive = systemItems.some((item) => pathname === item.href);

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

        {/* Right: meta + wallet + alerts + settings */}
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
          <WalletButton />
          <AlertBell
            unreadCount={alerts.unreadCount}
            triggeredAlerts={alerts.triggeredAlerts}
            activeCount={alerts.activeAlerts.length}
            onRemove={alerts.removeAlert}
            onClearTriggered={alerts.clearTriggered}
          />
          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                settingsOpen || isSystemActive
                  ? "border-accent/50 bg-accent/15 text-accent shadow-[0_0_18px_rgba(0,229,168,0.35)]"
                  : "border-accent/30 bg-accent/10 text-accent shadow-[0_0_14px_rgba(0,229,168,0.22)] hover:bg-accent/15 hover:border-accent/50 hover:shadow-[0_0_20px_rgba(0,229,168,0.4)]"
              }`}
              title="System settings"
            >
              <SettingsIcon size={15} />
            </button>
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-xl border border-border-default bg-card shadow-2xl shadow-black/50"
                >
                  <div className="px-4 py-3 border-b border-border-default">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-txt-primary">System</h3>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(false)}
                        className="cursor-pointer text-txt-muted hover:text-txt-primary transition-colors"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                    <p className="text-[11px] text-txt-muted mt-0.5">Configuration & resources</p>
                  </div>
                  <div className="p-1.5">
                    {systemItems.map(({ href, label, Icon, description }) => {
                      const itemActive = pathname === href;
                      return (
                        <button
                          key={href}
                          type="button"
                          onClick={() => navigate(href)}
                          className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            itemActive ? "bg-accent-muted" : "hover:bg-elevated"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            itemActive ? "bg-accent/15 text-accent" : "bg-elevated text-txt-muted"
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-semibold ${itemActive ? "text-accent" : "text-txt-primary"}`}>
                              {label}
                            </div>
                            <div className="text-[11px] text-txt-muted mt-0.5">{description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border-default">
                    <p className="text-[10px] text-txt-faint">v0.1 Beta · NoHype Labs</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </div>
  );
}
