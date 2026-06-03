"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import WalletButton from "./WalletButton";
import AlertBell from "./AlertBell";
import StatusDot from "@/components/ui/StatusDot";
import MarketTickerTape from "./MarketTickerTape";
import { useAlerts } from "@/lib/hooks/useAlerts";
import {
  ActivityIcon,
  BellIcon,
  ChartIcon,
  DocsIcon,
  DocumentIcon,
  HistoryIcon,
  HomeIcon,
  MenuIcon,
  PerformanceIcon,
  SettingsIcon,
  SignalIcon,
  StrategyIcon,
  TradeIcon,
  CloseIcon,
} from "@/components/ui/icons";
import type { SoDEXTicker } from "@/lib/sodex-types";

interface Props {
  sodexStatus?: "connected" | "error" | "loading";
  tickerCount?: number;
  tickerMap?: Map<string, SoDEXTicker>;
  onTickerClick?: (symbol: string) => void;
}

const navGroups = {
  overview: [
    { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
    { href: "/signals", label: "Signals", Icon: SignalIcon },
    { href: "/screener", label: "Screener", Icon: ActivityIcon },
    { href: "/signal-history", label: "Signal History", Icon: HistoryIcon },
    { href: "/performance", label: "Performance", Icon: PerformanceIcon },
  ],
  trading: [
    { href: "/trading", label: "Trading", Icon: TradeIcon },
    { href: "/portfolio", label: "Portfolio", Icon: ChartIcon },
    { href: "/alerts", label: "Alerts", Icon: BellIcon },
    { href: "/journal", label: "Journal", Icon: DocumentIcon },
    { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
    { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
  ],
};

const systemItems = [
  { href: "/settings", label: "Settings", Icon: SettingsIcon, description: "Preferences & configuration" },
  { href: "/docs", label: "Docs", Icon: DocsIcon, description: "In-app documentation" },
];

const directNavItems = [
  { href: "/signals", label: "Signal", Icon: SignalIcon },
  { href: "/trading", label: "Trading", Icon: TradeIcon },
];

const directNavHrefs = new Set(directNavItems.map((item) => item.href));

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  tickerMap,
  onTickerClick,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pagesOpen, setPagesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const tickerArray = tickerMap ? Array.from(tickerMap.values()) : null;
  const alerts = useAlerts(tickerArray);

  const dotStatus =
    sodexStatus === "connected" ? "live" : sodexStatus === "loading" ? "warning" : "error";

  const statusLabel =
    sodexStatus === "connected" ? "SODEX" : sodexStatus === "loading" ? "SODEX..." : "SODEX OFF";

  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const activePage = Object.values(navGroups).flat().find((item) => pathname === item.href);
  const moreMenuActive = Boolean(activePage && !directNavHrefs.has(activePage.href));

  useEffect(() => {
    Object.values(navGroups).flat().forEach((item) => router.prefetch(item.href));
    systemItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  // Close settings modal on outside click
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

  // Close settings modal on route change
  useEffect(() => {
    setSettingsOpen(false);
    setPagesOpen(false);
  }, [pathname]);

  const navigate = (href: string) => {
    router.push(href);
    setPagesOpen(false);
    setSettingsOpen(false);
  };

  // Check if any system page is active
  const isSystemActive = systemItems.some((item) => pathname === item.href);

  const pagesMenuButton = () => {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPagesOpen(!pagesOpen)}
          aria-label="More pages menu"
          aria-expanded={pagesOpen}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
            moreMenuActive
              ? "border-accent/35 bg-accent/10 text-accent"
              : "border-border-default bg-elevated/45 text-txt-primary hover:border-accent/30 hover:bg-accent/10"
          }`}
          title="More pages"
        >
          <MenuIcon size={15} />
        </button>
        <AnimatePresence>
          {pagesOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-10 z-50 w-56 rounded-xl border border-border-default bg-card p-1.5 shadow-2xl shadow-black/50"
            >
              {(["overview", "trading"] as const).map((groupKey, index) => (
                <div key={groupKey}>
                  {index > 0 && <div className="my-1 h-px bg-border-default" />}
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-txt-faint">
                    {groupKey === "overview" ? "Overview" : "Trading"}
                  </div>
                  {navGroups[groupKey].filter(({ href }) => !directNavHrefs.has(href)).map(({ href, label: itemLabel, Icon }) => {
                    const itemActive = pathname === href;
                    return (
                      <button
                        key={href}
                        type="button"
                        onClick={() => navigate(href)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                          itemActive
                            ? "bg-accent-muted text-accent"
                            : "text-txt-secondary hover:bg-elevated hover:text-txt-primary"
                        }`}
                      >
                        <Icon size={14} className={itemActive ? "text-accent" : "text-txt-muted"} />
                        {itemLabel}
                      </button>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="shrink-0">
      {/* Mobile: scrolling market tape as separate bar */}
      <div className="lg:hidden">
        <MarketTickerTape tickerMap={tickerMap} onTickerClick={onTickerClick} />
      </div>

      {/* Main header bar */}
      <header className="relative flex items-center justify-between gap-3 px-4 h-12 bg-surface border-b border-border-default">
        {/* Subtle accent glow at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        {/* Left: brand + primary navigation */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            {pagesMenuButton()}
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex cursor-pointer items-center gap-2 rounded-lg pr-1 transition-opacity hover:opacity-85"
              aria-label="Go to dashboard"
            >
              <Image
                src="/icons/signalflow-logo.png"
                alt="SignalFlow logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <span className="font-bold text-[13px] text-txt-primary tracking-tight">SignalFlow</span>
            </button>
            <div
              className="hidden lg:flex items-center gap-1.5 rounded border border-border-default bg-elevated/25 px-1.5 py-0.5"
              title={
                sodexStatus === "connected"
                  ? "SoDEX live"
                  : sodexStatus === "loading"
                    ? "Connecting to SoDEX"
                    : "SoDEX offline"
              }
            >
              <StatusDot status={dotStatus} pulse size="sm" />
              <span className="font-mono text-[9px] font-semibold text-txt-muted">{statusLabel}</span>
            </div>
          </div>

          <div className="h-5 w-px bg-border-default" />

          <nav className="flex items-center gap-1 rounded-xl border border-border-default bg-elevated/20 px-1.5 py-1">
            {directNavItems.map(({ href, label, Icon }) => {
              const itemActive = pathname === href;
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => navigate(href)}
                  className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                    itemActive
                      ? "border-accent/35 bg-accent/10 text-accent"
                      : "border-transparent text-txt-secondary hover:border-accent/25 hover:bg-accent/10 hover:text-txt-primary"
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Center: scrolling ticker tape (desktop only) */}
        <div
          className="relative hidden lg:flex flex-1 min-w-0 mx-0 overflow-hidden rounded-md bg-[#060810]"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
          }}
        >
          <MarketTickerTape tickerMap={tickerMap} embedded onTickerClick={onTickerClick} />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface/80 to-transparent" />
        </div>

        {/* Right: system modal + wallet */}
        <div className="flex min-w-0 items-center gap-2.5 shrink-0">
          <div className="md:hidden flex items-center gap-1">
            <StatusDot status={dotStatus} pulse size="sm" />
          </div>

          {tickerCount !== undefined && tickerCount > 0 && (
            <span className="hidden xl:inline-flex text-[10px] font-mono font-semibold text-txt-muted">
              {tickerCount} PAIRS
            </span>
          )}
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-txt-muted">
            {timeStr}
            <span className="text-txt-dim">UTC+7</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </span>
          <WalletButton />
          <AlertBell
            unreadCount={alerts.unreadCount}
            triggeredAlerts={alerts.triggeredAlerts}
            onNavigate={() => navigate("/alerts")}
          />
          {/* Gear icon → System modal */}
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
