"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import WalletButton from "./WalletButton";
import { pairToSodexSymbol, sodexSymbolToBase } from "@/lib/pair-map";
import StatusDot from "@/components/ui/StatusDot";
import MarketTickerTape from "./MarketTickerTape";
import {
  ActivityIcon,
  ChartIcon,
  ChevronDownIcon,
  DocsIcon,
  HistoryIcon,
  HomeIcon,
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
  selectedPair?: string;
  onTickerClick?: (symbol: string) => void;
}

const navGroups = {
  overview: [
    { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
    { href: "/signals", label: "Signals", Icon: SignalIcon },
    { href: "/signal-history", label: "Signal History", Icon: HistoryIcon },
    { href: "/performance", label: "Performance", Icon: PerformanceIcon },
  ],
  trading: [
    { href: "/trading", label: "Trading", Icon: TradeIcon },
    { href: "/portfolio", label: "Portfolio", Icon: ChartIcon },
    { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
    { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
  ],
};

const systemItems = [
  { href: "/settings", label: "Settings", Icon: SettingsIcon, description: "Preferences & configuration" },
  { href: "/docs", label: "Docs", Icon: DocsIcon, description: "In-app documentation" },
];

type MenuKey = keyof typeof navGroups;

export default function TopBar({
  sodexStatus = "loading",
  tickerCount,
  tickerMap,
  selectedPair,
  onTickerClick,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const dotStatus =
    sodexStatus === "connected" ? "live" : sodexStatus === "loading" ? "warning" : "error";

  const statusLabel =
    sodexStatus === "connected"
      ? "SoDEX Live"
      : sodexStatus === "loading"
        ? "Connecting..."
        : "SoDEX Offline";

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

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
    setOpenMenu(null);
  }, [pathname]);

  const navigate = (href: string) => {
    router.push(href);
    setOpenMenu(null);
    setSettingsOpen(false);
  };

  // Check if any system page is active
  const isSystemActive = systemItems.some((item) => pathname === item.href);

  const menuButton = (key: MenuKey, label: string) => {
    const active = navGroups[key].some((item) => pathname === item.href);
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === key ? null : key)}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
            active
              ? "border-accent/35 bg-accent/10 text-accent"
              : "border-border-default bg-elevated/35 text-txt-secondary hover:text-txt-primary hover:border-border-muted"
          }`}
        >
          {label}
          <ChevronDownIcon size={11} />
        </button>
        <AnimatePresence>
          {openMenu === key && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-10 z-50 w-52 rounded-xl border border-border-default bg-card p-1.5 shadow-2xl shadow-black/50"
            >
              {navGroups[key].map(({ href, label: itemLabel, Icon }) => {
                const itemActive = pathname === href;
                return (
                  <button
                    key={href}
                    type="button"
                    onClick={() => navigate(href)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
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
            <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ActivityIcon size={13} />
            </div>
            <span className="font-bold text-[13px] text-txt-primary tracking-tight">SignalFlow</span>
          </div>

          <div className="h-5 w-px bg-border-default" />

          {/* Selected ticker info */}
          {selectedPair && tickerMap && (() => {
            const sodexSym = pairToSodexSymbol(selectedPair);
            const ticker = sodexSym ? tickerMap.get(sodexSym) : undefined;
            if (!ticker) return null;
            const base = sodexSymbolToBase(sodexSym);
            const price = parseFloat(ticker.lastPx);
            if (!Number.isFinite(price) || price <= 0) return null;
            const isUp = ticker.changePct >= 0;
            const high = parseFloat(ticker.highPx);
            const low = parseFloat(ticker.lowPx);
            const vol = parseFloat(ticker.quoteVolume);
            const fmtPrice = (v: number) => v >= 10000
              ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : v >= 1
                ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : v.toFixed(4);
            const fmtVol = (v: number) => {
              if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
              if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
              if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
              return `$${v.toFixed(0)}`;
            };
            return (
              <div className="hidden md:flex items-center gap-3 ml-1">
                <div className="flex items-center gap-1.5">
                  <img
                    src={`https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`}
                    alt={base}
                    width={16}
                    height={16}
                    className="rounded-full"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs font-bold text-txt-primary">{base}/USDC</span>
                </div>
                <span className="text-xs font-mono font-bold text-txt-primary tabular-nums">{fmtPrice(price)}</span>
                <span className={`flex items-center gap-0.5 text-[11px] font-mono font-semibold tabular-nums ${isUp ? "text-buy" : "text-sell"}`}>
                  {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{ticker.changePct.toFixed(2)}%
                </span>
                <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-txt-muted">
                  <span>H <span className="text-txt-secondary">{fmtPrice(high)}</span></span>
                  <span>L <span className="text-txt-secondary">{fmtPrice(low)}</span></span>
                  <span>Vol <span className="text-txt-secondary">{Number.isFinite(vol) ? fmtVol(vol) : "-"}</span></span>
                </div>
              </div>
            );
          })()}

          <nav className="flex items-center gap-1">
            {menuButton("overview", "Overview")}
            {menuButton("trading", "Trading")}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 ml-1">
            <StatusDot status={dotStatus} pulse size="sm" />
            <span className="text-[10px] font-semibold text-txt-secondary">{statusLabel}</span>
          </div>
        </div>

        {/* Center: scrolling ticker tape (desktop only) */}
        <div className="hidden lg:flex w-[49.5%] min-w-0 mx-4 overflow-hidden rounded-md bg-[#060810]">
          <MarketTickerTape tickerMap={tickerMap} embedded onTickerClick={onTickerClick} />
        </div>

        {/* Right: system modal + wallet */}
        <div className="flex min-w-0 items-center gap-2.5 shrink-0">
          <div className="md:hidden flex items-center gap-1">
            <StatusDot status={dotStatus} pulse size="sm" />
          </div>

          {/* Gear icon → System modal */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                settingsOpen || isSystemActive
                  ? "border-accent/35 bg-accent/10 text-accent"
                  : "border-accent/10 bg-accent/5 text-txt-muted hover:text-accent hover:bg-accent/10 hover:border-accent/25"
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
                  className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-border-default bg-card shadow-2xl shadow-black/50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border-default">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-txt-primary">System</h3>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(false)}
                        className="text-txt-muted hover:text-txt-primary transition-colors"
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
                          className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            itemActive
                              ? "bg-accent-muted"
                              : "hover:bg-elevated"
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

          {tickerCount !== undefined && tickerCount > 0 && (
            <span className="hidden xl:inline-flex text-[10px] font-mono font-semibold text-txt-muted">
              {tickerCount} PAIRS
            </span>
          )}
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-txt-muted">
            {timeStr}
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </span>
          <WalletButton />
        </div>
      </header>
    </div>
  );
}
