"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import { sodexSymbolToBase } from "@/lib/pair-map";

/* ── Types ── */

type Category = "Crypto" | "Stocks" | "Commodities" | "Indices";

interface Market {
  symbol: string;
  displayPair: string;
  base: string;
  lastPrice: number;
  change24h: number;
  changeAbs: number;
  volume24h: number;
  category: Category;
  status: string;
  signal: { action: string; confidence: number } | null;
  maxLev: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectMarket: (pair: string) => void;
  currentSymbol: string;
  tickerMap?: Map<string, SoDEXTicker>;
  liveSignals?: Signal[];
}

/* ── Category detection ── */

const STOCKS = new Set(["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "META", "NVDA", "MSTR", "COIN", "HOOD"]);
const COMMODITIES = new Set(["XAUT", "GOLD", "SILVER", "WTIOIL", "BRENTOIL", "XAU"]);
const INDICES = new Set(["MAG7SSI", "MEMESSI", "DEFISSI", "USSI", "XYZ100", "SP500", "NASDAQ"]);

function categorize(base: string): Category {
  const upper = base.toUpperCase().replace(/\.SSI$/, "SSI").replace(/[-_]/g, "");
  if (STOCKS.has(upper)) return "Stocks";
  if (COMMODITIES.has(upper)) return "Commodities";
  if (INDICES.has(upper)) return "Indices";
  if (upper.includes("SSI") || upper.includes("INDEX")) return "Indices";
  return "Crypto";
}

/* ── SVG Icons ── */

function CategoryIcon({ category, size = 12 }: { category: Category; size?: number }) {
  const s = { width: size, height: size };
  switch (category) {
    case "Crypto":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9 8h4.5a2.5 2.5 0 010 5H9V8z" /><path d="M9 13h5a2.5 2.5 0 010 5H9v-5z" /><path d="M11 6v2M13 6v2M11 16v2M13 16v2" /></svg>;
    case "Stocks":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
    case "Commodities":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a7 7 0 00-3 13.33V17h6v-1.67A7 7 0 0012 2z" /><path d="M9 17h6M10 21h4" /></svg>;
    case "Indices":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /><path d="M13 14l2 2 3-3" /></svg>;
  }
}

function StarIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  if (filled) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-hold)" stroke="var(--color-hold)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

function SignalBadge({ action, confidence }: { action: string; confidence: number }) {
  const isUp = action === "LONG";
  const isDown = action === "SHORT";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded text-[8px] font-bold uppercase leading-none border ${
      isUp ? "bg-buy/10 text-buy border-buy/20" : isDown ? "bg-sell/10 text-sell border-sell/20" : "bg-hold/10 text-hold border-hold/20"
    }`}>
      {isUp ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        : isDown ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>}
      {action} <span className="opacity-50">{confidence}%</span>
    </span>
  );
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

function MarketIcon({ base, category, size = 26 }: { base: string; category: Category; size?: number }) {
  const [errored, setErrored] = useState(false);

  if (category === "Crypto" && !errored) {
    return (
      <img
        src={`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${base.toLowerCase()}.svg`}
        alt={base} width={size} height={size}
        className="shrink-0 rounded-full"
        onError={() => setErrored(true)}
      />
    );
  }

  const hue = base.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  const bg = category === "Stocks" ? `hsl(220, 60%, 35%)` : category === "Commodities" ? `hsl(40, 60%, 35%)` : category === "Indices" ? `hsl(280, 50%, 35%)` : `hsl(${hue}, 45%, 30%)`;
  return (
    <span className="inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ width: size, height: size, backgroundColor: bg }}>
      {base.slice(0, 2)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════ */

export default function MarketSelectorModal({ isOpen, onClose, onSelectMarket, currentSymbol, tickerMap, liveSignals = [] }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "change" | "price">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "watchlist">("all");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch(""); setHighlightIdx(0); setActiveTab("all"); setActiveCategory("All");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const signalMap = useMemo(() => {
    const map = new Map<string, { action: string; confidence: number }>();
    for (const s of liveSignals) {
      const base = s.pair.split("/")[0];
      if (!map.has(base)) map.set(base, { action: s.action, confidence: s.confidence });
    }
    return map;
  }, [liveSignals]);

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
      const maxLev = ["BTC", "ETH", "SOL"].includes(base.toUpperCase()) ? 20 : 5;
      list.push({ symbol, displayPair: `${base}/USDC`, base, lastPrice: price, change24h: changePct, changeAbs, volume24h: vol, category: categorize(base), status: "TRADING", signal: signalMap.get(base) ?? null, maxLev });
    }
    return list;
  }, [tickerMap, signalMap]);

  const availableCategories = useMemo(() => {
    const cats = new Set<Category>();
    markets.forEach((m) => cats.add(m.category));
    return ["All" as const, ...(["Crypto", "Stocks", "Commodities", "Indices"] as Category[]).filter((c) => cats.has(c))];
  }, [markets]);

  const hasMultipleCategories = availableCategories.length > 2;

  const filtered = useMemo(() => {
    let list = markets;
    if (activeTab === "watchlist") list = list.filter((m) => watchlist.includes(m.base));
    if (activeCategory !== "All") list = list.filter((m) => m.category === activeCategory);
    if (search.trim()) {
      const q = search.toUpperCase().trim();
      list = list.filter((m) => m.base.includes(q) || m.displayPair.toUpperCase().includes(q));
    }
    list.sort((a, b) => {
      const av = sortBy === "volume" ? a.volume24h : sortBy === "change" ? a.change24h : a.lastPrice;
      const bv = sortBy === "volume" ? b.volume24h : sortBy === "change" ? b.change24h : b.lastPrice;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [markets, search, sortBy, sortDir, activeTab, activeCategory, watchlist]);

  const totalVolume = useMemo(() => markets.reduce((s, m) => s + m.volume24h, 0), [markets]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: markets.length };
    markets.forEach((m) => { counts[m.category] = (counts[m.category] || 0) + 1; });
    return counts;
  }, [markets]);

  const toggleWatch = useCallback((base: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(base) ? prev.filter((b) => b !== base) : [...prev, base];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && filtered[highlightIdx]) { onSelectMarket(filtered[highlightIdx].displayPair); onClose(); }
  }, [filtered, highlightIdx, onClose, onSelectMarket]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlightIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const toggleSort = (col: "volume" | "change" | "price") => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortArrow = ({ col }: { col: string }) => (
    <span className={`ml-0.5 text-[9px] ${sortBy === col ? "text-accent" : "text-txt-faint"}`}>
      {sortBy === col ? (sortDir === "desc" ? "▼" : "▲") : "↕"}
    </span>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[4vh] bg-black/75 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl border border-border-muted bg-card shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ═══ Search Bar ═══ */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border-default bg-inset/40">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 border border-accent/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
          <input ref={inputRef} type="text" value={search} onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
            placeholder={`Search ${markets.length} markets…`}
            className="flex-1 bg-transparent text-sm text-txt-primary outline-none placeholder:text-txt-muted" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-txt-faint font-mono px-2 py-0.5 rounded bg-inset border border-border-default">{filtered.length}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-faint hover:text-txt-secondary hover:bg-elevated cursor-pointer transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ═══ Filter Tabs ═══ */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border-default">
          <div className="flex items-center gap-1">
            {[
              { id: "all" as const, label: "All Markets", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
              { id: "watchlist" as const, label: "Watchlist", icon: <StarIcon filled size={12} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setHighlightIdx(0); }}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? "bg-accent/12 text-accent border border-accent/25 shadow-[0_0_8px_rgba(0,229,168,0.08)]"
                    : "text-txt-dim hover:text-txt-secondary border border-transparent hover:bg-elevated/30"
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-txt-faint">
            <span className="font-mono">{markets.length} pairs</span>
            <span className="text-border-default">·</span>
            <span className="font-mono">{fmtVol(totalVolume)} volume</span>
          </div>
        </div>

        {/* ═══ Category Sub-tabs ═══ */}
        {hasMultipleCategories && (
          <div className="shrink-0 flex items-center gap-1.5 px-5 py-2 border-b border-border-default bg-inset/20 overflow-x-auto scrollbar-none">
            {availableCategories.map((cat) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setHighlightIdx(0); }}
                className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all shrink-0 ${
                  activeCategory === cat
                    ? "bg-accent/12 text-accent border border-accent/25"
                    : "text-txt-dim hover:text-txt-secondary border border-transparent hover:border-border-default hover:bg-elevated/20"
                }`}>
                {cat !== "All" && <CategoryIcon category={cat} size={11} />}
                <span>{cat}</span>
                <span className={`text-[9px] ml-0.5 px-1 py-0 rounded ${activeCategory === cat ? "bg-accent/15 text-accent" : "bg-elevated text-txt-faint"}`}>{catCounts[cat] || 0}</span>
              </button>
            ))}
          </div>
        )}

        {/* ═══ Table Header ═══ */}
        <div className="shrink-0 grid grid-cols-[1fr_120px_90px_90px_40px] gap-3 px-5 py-2.5 border-b border-border-default bg-inset/30 text-[10px] text-txt-muted font-medium">
          <span className="tracking-wide">Market</span>
          <span className="text-right cursor-pointer hover:text-txt-secondary transition-colors" onClick={() => toggleSort("price")}>Last Price<SortArrow col="price" /></span>
          <span className="text-right cursor-pointer hover:text-txt-secondary transition-colors" onClick={() => toggleSort("change")}>24h Change<SortArrow col="change" /></span>
          <span className="text-right cursor-pointer hover:text-txt-secondary transition-colors" onClick={() => toggleSort("volume")}>Volume<SortArrow col="volume" /></span>
          <span className="text-center">★</span>
        </div>

        {/* ═══ Market List ═══ */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-elevated/40 mx-auto mb-3 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                </div>
                <p className="text-sm text-txt-muted font-medium">No markets found</p>
                <p className="text-[11px] text-txt-faint mt-1">{activeTab === "watchlist" ? "Star some markets to build your watchlist" : "Try a different search term"}</p>
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
                  className={`grid grid-cols-[1fr_120px_90px_90px_40px] gap-3 px-5 py-3 cursor-pointer transition-all items-center border-b border-border-default/50 ${
                    isHighlighted ? "bg-elevated/50" : "hover:bg-elevated/30"
                  } ${isActive ? "bg-accent/8 border-l-2 border-l-accent" : ""}`}
                  onClick={() => { onSelectMarket(m.displayPair); onClose(); }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                >
                  {/* Market info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <MarketIcon base={m.base} category={m.category} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold ${isActive ? "text-accent" : "text-txt-primary"}`}>{m.base}</span>
                        <span className="text-[10px] text-txt-faint">/USDC</span>
                        {m.category !== "Crypto" && (
                          <span className="text-[8px] px-1.5 py-[1px] rounded bg-elevated text-txt-dim font-semibold uppercase">{m.category.slice(0, 3)}</span>
                        )}
                        <span className="text-[8px] px-1.5 py-[1px] rounded bg-accent/10 text-accent font-bold font-mono border border-accent/15">{m.maxLev}x</span>
                        {m.signal && <SignalBadge action={m.signal.action} confidence={m.signal.confidence} />}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-[12px] font-mono font-bold text-txt-primary text-right tabular-nums">${fmtPrice(m.lastPrice)}</span>

                  {/* 24h Change */}
                  <div className="text-right">
                    <p className={`text-[12px] font-mono font-semibold tabular-nums ${m.change24h >= 0 ? "text-buy" : "text-sell"}`}>
                      {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
                    </p>
                    <p className={`text-[9px] font-mono tabular-nums ${m.change24h >= 0 ? "text-buy/50" : "text-sell/50"}`}>
                      {m.changeAbs >= 0 ? "+" : ""}{fmtPrice(Math.abs(m.changeAbs))}
                    </p>
                  </div>

                  {/* Volume */}
                  <span className="text-[12px] font-mono text-txt-secondary text-right tabular-nums">{fmtVol(m.volume24h)}</span>

                  {/* Star */}
                  <button onClick={(e) => { e.stopPropagation(); toggleWatch(m.base); }}
                    className={`flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${isFav ? "text-hold" : "text-txt-faint/30 hover:text-hold/60"}`}>
                    <StarIcon filled={isFav} size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-border-default bg-inset/30">
          <div className="flex items-center gap-3 text-[10px] text-txt-faint">
            <span className="font-mono">{filtered.length} markets</span>
            <span className="text-border-default">·</span>
            <span className="font-mono">{fmtVol(filtered.reduce((s, m) => s + m.volume24h, 0))} volume</span>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-txt-faint">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-inset border border-border-default text-[8px] font-mono">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-inset border border-border-default text-[8px] font-mono">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-inset border border-border-default text-[8px] font-mono">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
