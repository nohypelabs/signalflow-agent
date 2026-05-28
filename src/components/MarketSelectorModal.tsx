"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { SoDEXTicker } from "@/lib/types/trade";
import { sodexSymbolToBase } from "@/lib/pair-map";

/* ── Types ── */

interface Market {
  symbol: string;       // "vBTC_vUSDC"
  displayPair: string;  // "BTC/USDC"
  base: string;         // "BTC"
  lastPrice: number;
  change24h: number;
  changeAbs: number;
  volume24h: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectMarket: (pair: string) => void;
  currentSymbol: string;
  tickerMap?: Map<string, SoDEXTicker>;
}

/* ── Helpers ── */

function fmtPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

function fmtVol(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}b`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}m`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

const WATCHLIST_KEY = "sf-watchlist";

function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); } catch { return []; }
}

function saveWatchlist(list: string[]) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch {}
}

/* ── Market Icon ── */

function MarketIcon({ base, size = 24 }: { base: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const url = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${base.toLowerCase()}.svg`;

  if (errored) {
    const hue = base.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
    return (
      <span
        className="inline-flex items-center justify-center rounded-full text-[8px] font-bold text-white shrink-0"
        style={{ width: size, height: size, backgroundColor: `hsl(${hue}, 50%, 35%)` }}
      >
        {base.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={base}
      width={size}
      height={size}
      className="shrink-0"
      onError={() => setErrored(true)}
    />
  );
}

/* ══════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════ */

export default function MarketSelectorModal({ isOpen, onClose, onSelectMarket, currentSymbol, tickerMap }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "change" | "price">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load watchlist
  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightIdx(0);
      setShowWatchlist(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build market list from tickerMap
  const markets = useMemo<Market[]>(() => {
    if (!tickerMap) return [];
    const list: Market[] = [];
    for (const [symbol, t] of tickerMap) {
      const base = sodexSymbolToBase(symbol);
      const price = parseFloat(t.lastPx);
      if (!Number.isFinite(price) || price <= 0) continue;
      const vol = parseFloat(t.quoteVolume || t.volume || "0");
      const changePct = typeof t.changePct === "number" && !Number.isNaN(t.changePct) ? t.changePct : 0;
      const openPx = parseFloat(t.openPx || "0");
      const changeAbs = openPx > 0 ? price - openPx : 0;
      list.push({ symbol, displayPair: `${base}/USDC`, base, lastPrice: price, change24h: changePct, changeAbs, volume24h: vol });
    }
    return list;
  }, [tickerMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = markets;

    // Watchlist filter
    if (showWatchlist) {
      list = list.filter((m) => watchlist.includes(m.base));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toUpperCase().trim();
      list = list.filter((m) => m.base.includes(q) || m.displayPair.toUpperCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      const av = sortBy === "volume" ? a.volume24h : sortBy === "change" ? a.change24h : a.lastPrice;
      const bv = sortBy === "volume" ? b.volume24h : sortBy === "change" ? b.change24h : b.lastPrice;
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return list;
  }, [markets, search, sortBy, sortDir, showWatchlist, watchlist]);

  // Stats
  const totalVolume = useMemo(() => markets.reduce((s, m) => s + m.volume24h, 0), [markets]);

  // Toggle watchlist
  const toggleWatch = useCallback((base: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(base) ? prev.filter((b) => b !== base) : [...prev, base];
      saveWatchlist(next);
      return next;
    });
  }, []);

  // Keyboard nav
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && filtered[highlightIdx]) {
      onSelectMarket(filtered[highlightIdx].displayPair);
      onClose();
    }
  }, [filtered, highlightIdx, onClose, onSelectMarket]);

  // Scroll highlighted row into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlightIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  // Sort toggle
  const toggleSort = (col: "volume" | "change" | "price") => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortArrow = ({ col }: { col: string }) => (
    <span className={`ml-0.5 text-[8px] ${sortBy === col ? "text-accent" : "text-txt-faint"}`}>
      {sortBy === col ? (sortDir === "desc" ? "▼" : "▲") : "↕"}
    </span>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border border-border-default bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ═══ Search Bar ═══ */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border-default bg-inset/30">
          <span className="text-txt-dim font-mono text-sm">&gt;_</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
            placeholder={`Search ${markets.length} live markets`}
            className="flex-1 bg-transparent text-sm text-txt-primary outline-none placeholder:text-txt-faint font-mono"
          />
          <button onClick={onClose} className="text-txt-faint hover:text-txt-secondary cursor-pointer text-sm px-1">✕</button>
        </div>

        {/* ═══ Filter Tabs ═══ */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border-default bg-inset/20">
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All" },
              { id: "watchlist", label: `★ Watchlist` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setShowWatchlist(tab.id === "watchlist"); setHighlightIdx(0); }}
                className={`text-[10px] px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                  (tab.id === "watchlist" && showWatchlist) || (tab.id === "all" && !showWatchlist)
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "text-txt-dim hover:text-txt-secondary border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-txt-faint">
            <span className="font-mono">{markets.length} markets</span>
            <span>·</span>
            <span className="font-mono">{fmtVol(totalVolume)} vol</span>
          </div>
        </div>

        {/* ═══ Table Header ═══ */}
        <div className="shrink-0 grid grid-cols-[1fr_100px_80px_80px_40px] gap-2 px-4 py-2 border-b border-border-default bg-inset/30 text-[9px] text-txt-faint uppercase tracking-wider">
          <span>Market</span>
          <span className="text-right cursor-pointer hover:text-txt-secondary" onClick={() => toggleSort("price")}>Last Price<SortArrow col="price" /></span>
          <span className="text-right cursor-pointer hover:text-txt-secondary" onClick={() => toggleSort("change")}>24h<SortArrow col="change" /></span>
          <span className="text-right cursor-pointer hover:text-txt-secondary" onClick={() => toggleSort("volume")}>Vol<SortArrow col="volume" /></span>
          <span className="text-center">★</span>
        </div>

        {/* ═══ Market List ═══ */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-txt-muted">No markets found</p>
                <p className="text-[10px] text-txt-faint mt-1">{showWatchlist ? "Star some markets to build your watchlist" : "Try a different search term"}</p>
              </div>
            </div>
          ) : (
            filtered.map((m, idx) => {
              const isActive = m.displayPair === currentSymbol;
              const isHighlighted = idx === highlightIdx;
              const isFav = watchlist.includes(m.base);

              return (
                <div
                  key={m.symbol}
                  data-idx={idx}
                  className={`grid grid-cols-[1fr_100px_80px_80px_40px] gap-2 px-4 py-2.5 cursor-pointer transition-colors items-center ${
                    isHighlighted ? "bg-elevated/40" : "hover:bg-elevated/20"
                  } ${isActive ? "bg-accent/5" : ""}`}
                  onClick={() => { onSelectMarket(m.displayPair); onClose(); }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                >
                  {/* Market info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MarketIcon base={m.base} size={22} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isActive ? "text-accent" : "text-txt-primary"}`}>{m.base}</span>
                        <span className="text-[9px] text-txt-faint">/USDC</span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-elevated text-txt-dim font-mono">P</span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-xs font-mono font-bold text-txt-primary text-right tabular-nums">${fmtPrice(m.lastPrice)}</span>

                  {/* 24h Change */}
                  <div className="text-right">
                    <p className={`text-[11px] font-mono font-semibold tabular-nums ${m.change24h >= 0 ? "text-buy" : "text-sell"}`}>
                      {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
                    </p>
                    <p className={`text-[9px] font-mono tabular-nums ${m.change24h >= 0 ? "text-buy/60" : "text-sell/60"}`}>
                      {m.changeAbs >= 0 ? "+" : ""}{fmtPrice(Math.abs(m.changeAbs))}
                    </p>
                  </div>

                  {/* Volume */}
                  <span className="text-[11px] font-mono text-txt-secondary text-right tabular-nums">{fmtVol(m.volume24h)}</span>

                  {/* Star */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWatch(m.base); }}
                    className={`text-center cursor-pointer transition-colors ${isFav ? "text-hold" : "text-txt-faint hover:text-hold"}`}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border-default bg-inset/30">
          <div className="flex items-center gap-3 text-[9px] text-txt-faint font-mono">
            <span>{filtered.length} markets</span>
            <span>·</span>
            <span>{fmtVol(filtered.reduce((s, m) => s + m.volume24h, 0))} volume</span>
          </div>
          <div className="flex items-center gap-3 text-[8px] text-txt-faint">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
