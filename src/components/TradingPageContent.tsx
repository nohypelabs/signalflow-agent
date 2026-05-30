"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import type { Signal } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import TradingChart from "@/components/TradingChart";
import OrderForm from "@/components/OrderForm";
import OrderbookDepth from "@/components/OrderbookDepth";
import OpenOrders from "@/components/OpenOrders";
import RecentTrades from "@/components/RecentTrades";
import RecentTradesList from "@/components/RecentTradesList";
import PaperTradingStats from "@/components/PaperTradingStats";
import SpreadIndicator from "@/components/SpreadIndicator";
import HighLowRange from "@/components/HighLowRange";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ClipboardIcon, BarChartIcon, BriefcaseIcon, DocumentIcon } from "@/components/ui/icons";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import type { PaperTrade } from "@/lib/hooks/usePaperTrading";

/* ── Types ── */
type TradeNotice = { id: number; kind: "success" | "error" | "info"; title: string; detail: string; rows?: { label: string; value: string; tone?: "buy" | "sell" | "accent" | "muted" }[] };
type TradeOrderInput = { side: "LONG" | "SHORT"; leverage: number; margin: number; quantity: number; takeProfit: string; stopLoss: string };
type PendingTradeAction =
  | { kind: "open"; mode: "paper" | "live"; pair: string; order: TradeOrderInput; entryPrice: number; takeProfit: number; stopLoss: number; liquidationPrice: number }
  | { kind: "close"; trade: PaperTrade; markPrice: number; pnl: number; roi: number };
type BookTab = "book" | "trades";
type BottomTab = "orders" | "trades" | "positions" | "stats" | "live";

/* ── Helpers ── */
function formatPrice(price: number): string { if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 }); if (price >= 100) return price.toFixed(2); if (price >= 1) return price.toFixed(3); return price.toFixed(5); }
function formatUsd(value: number): string { const abs = Math.abs(value); const f = abs >= 1000 ? abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : abs.toFixed(2); return `${value < 0 ? "-" : ""}$${f}`; }

/* ── Default widths (percentage) ── */
const DEFAULT_WIDTHS = { chart: 65, book: 18, form: 17 };
const MIN_WIDTHS = { chart: 30, book: 12, form: 12 };
const WIDTHS_KEY = "sf-panel-widths";
const BOTTOM_HEIGHT_KEY = "sf-bottom-height";
const DEFAULT_BOTTOM_HEIGHT = 200;
const MIN_BOTTOM_HEIGHT = 80;
const MAX_BOTTOM_HEIGHT_RATIO = 0.6; // max 60% of viewport

function loadWidths(): typeof DEFAULT_WIDTHS {
  if (typeof window === "undefined") return DEFAULT_WIDTHS;
  try {
    const saved = JSON.parse(localStorage.getItem(WIDTHS_KEY) || "{}");
    if (saved.chart && saved.book && saved.form) return saved;
  } catch {}
  return DEFAULT_WIDTHS;
}

function saveWidths(w: typeof DEFAULT_WIDTHS) {
  try { localStorage.setItem(WIDTHS_KEY, JSON.stringify(w)); } catch {}
}

function loadBottomHeight(): number {
  if (typeof window === "undefined") return DEFAULT_BOTTOM_HEIGHT;
  const v = parseInt(localStorage.getItem(BOTTOM_HEIGHT_KEY) || "", 10);
  return Number.isFinite(v) && v >= MIN_BOTTOM_HEIGHT ? v : DEFAULT_BOTTOM_HEIGHT;
}

function saveBottomHeight(h: number) {
  try { localStorage.setItem(BOTTOM_HEIGHT_KEY, String(h)); } catch {}
}

/* ══════════════════════════════════════════════════════
   RESIZE HANDLE
   ══════════════════════════════════════════════════════ */

function ResizeHandle({ onDrag, onDoubleClick }: { onDrag: (deltaX: number) => void; onDoubleClick: () => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientX - startX.current);
      startX.current = e.clientX;
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      className="w-1 shrink-0 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors relative group"
      style={{ marginLeft: "-1px", marginRight: "-1px", zIndex: 10 }}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

function ResizeHandleH({ onDrag, onDoubleClick }: { onDrag: (deltaY: number) => void; onDoubleClick: () => void }) {
  const dragging = useRef(false);
  const startY = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientY - startY.current);
      startY.current = e.clientY;
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      className="h-1.5 shrink-0 cursor-row-resize hover:bg-accent/40 active:bg-accent/60 transition-colors relative group border-t border-b border-border-default bg-inset/30"
      style={{ zIndex: 10 }}
    >
      <div className="absolute inset-x-0 -top-1 -bottom-1" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 rounded-full bg-border-muted group-hover:bg-accent/60 transition-colors" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */

export default function TradingPageContent() {
  const d = useDashboard();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState("BTC/USDC");
  const [tradeMode, setTradeMode] = useState<"paper" | "live">("paper");
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<TradeNotice | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingTradeAction | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("orders");
  const [bookTab, setBookTab] = useState<BookTab>("book");
  const [isMobile, setIsMobile] = useState(false);
  const paper = usePaperTrading();
  const checkPaperTpSl = paper.checkTpSl;

  /* ── Panel widths ── */
  const [widths, setWidths] = useState(loadWidths);
  const [bottomHeight, setBottomHeight] = useState(loadBottomHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((which: "chart" | "book", deltaPx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const totalWidth = container.offsetWidth;
    if (totalWidth <= 0) return;
    const deltaPct = (deltaPx / totalWidth) * 100;

    setWidths((prev) => {
      const other = which === "chart" ? "book" : "form";
      let newA = prev[which] + deltaPct;
      let newB = prev[other] - deltaPct;
      if (newA < MIN_WIDTHS[which]) { newB += newA - MIN_WIDTHS[which]; newA = MIN_WIDTHS[which]; }
      if (newB < MIN_WIDTHS[other]) { newA += newB - MIN_WIDTHS[other]; newB = MIN_WIDTHS[other]; }
      const next = { ...prev, [which]: newA, [other]: newB };
      saveWidths(next);
      return next;
    });
  }, []);

  const handleVerticalResize = useCallback((deltaY: number) => {
    // Dragging DOWN increases bottom panel height (shrinks chart)
    // Dragging UP decreases bottom panel height (grows chart)
    const root = rootRef.current;
    if (!root) return;
    const maxH = root.offsetHeight * MAX_BOTTOM_HEIGHT_RATIO;
    setBottomHeight((prev) => {
      const next = Math.max(MIN_BOTTOM_HEIGHT, Math.min(maxH, prev - deltaY));
      saveBottomHeight(next);
      return next;
    });
  }, []);

  const resetWidths = useCallback(() => {
    setWidths(DEFAULT_WIDTHS);
    saveWidths(DEFAULT_WIDTHS);
  }, []);

  const resetBottomHeight = useCallback(() => {
    setBottomHeight(DEFAULT_BOTTOM_HEIGHT);
    saveBottomHeight(DEFAULT_BOTTOM_HEIGHT);
  }, []);

  /* ── Trading logic (unchanged) ── */
  const tradingTypeParam = searchParams.get("type");
  const tradingType: TradingType | null = tradingTypeParam && ["scalping", "intraday", "swing", "position"].includes(tradingTypeParam) ? tradingTypeParam as TradingType : null;

  const signalContext = useMemo(() => { const id = searchParams.get("signal"); if (!id) return null; return d.liveSignals.find((s) => s.id === id) ?? null; }, [searchParams, d.liveSignals]);

  useEffect(() => { const p = searchParams.get("pair"); if (signalContext) setPair(signalContext.pair); else if (p) setPair(p); }, [searchParams, signalContext]);

  const coin = pair.split("/")[0];
  const sodexSymbol = `v${coin}_vUSDC`;
  const ticker = sodexSymbol ? d.tickerMap.get(sodexSymbol) : undefined;
  const currentPrice = ticker ? parseFloat(ticker.lastPx) : null;

  const currentPrices = useMemo(() => {
    const base = pair.split("/")[0]; const prices = new Map<string, number>();
    if (currentPrice && Number.isFinite(currentPrice)) { prices.set(base, currentPrice); prices.set(pair, currentPrice); }
    for (const t of d.tickers ?? []) { const mp = parseFloat(t.lastPx); if (!Number.isFinite(mp) || mp <= 0) continue; const [rb, rq] = t.symbol.split("_"); const tb = rb?.replace(/^v/, ""); const tq = rq?.replace(/^v/, ""); if (!tb) continue; prices.set(tb, mp); if (tq) prices.set(`${tb}/${tq}`, mp); }
    return prices;
  }, [currentPrice, d.tickers, pair]);

  useEffect(() => { if (currentPrices.size > 0) checkPaperTpSl(currentPrices); }, [currentPrices, checkPaperTpSl]);
  useEffect(() => { if (paper.error) setTradeError(paper.error); }, [paper.error]);
  useEffect(() => { setTradeError(null); }, [pair, tradeMode]);

  const openPaperTrades = useMemo(() => paper.trades.filter((t) => t.status === "OPEN"), [paper.trades]);
  const getMarkPrice = (t: PaperTrade) => { const b = t.pair.split("/")[0]; return currentPrices.get(b) ?? currentPrices.get(t.pair) ?? null; };
  const calcLiq = (ep: number, s: "LONG" | "SHORT", lev: number) => { const mm = 0.005; return s === "LONG" ? ep * (1 - 1 / lev + mm) : ep * (1 + 1 / lev - mm); };

  const handleExecute = (order: TradeOrderInput) => {
    const ep = currentPrice || 0; const tp = parseFloat(order.takeProfit) || 0; const sl = parseFloat(order.stopLoss) || 0; setTradeError(null);
    if (!ep) { setTradeError("Market price is not available."); return; }
    setPendingAction({ kind: "open", mode: tradeMode, pair, order, entryPrice: ep, takeProfit: tp, stopLoss: sl, liquidationPrice: calcLiq(ep, order.side, order.leverage) });
  };

  const executeConfirmedOpen = (a: Extract<PendingTradeAction, { kind: "open" }>) => {
    const { order, entryPrice, takeProfit: tp, stopLoss: sl } = a;
    if (a.mode === "paper") {
      const t = paper.openTrade({ pair: a.pair, side: order.side, leverage: order.leverage, margin: order.margin, entryPrice, takeProfit: tp, stopLoss: sl, signalId: signalContext?.id, confidence: signalContext?.confidence, tradingType: tradingType ?? undefined });
      if (!t) { const msg = paper.error ?? "Paper trade rejected."; setTradeError(msg); setNotice({ id: Date.now(), kind: "error", title: "Trade rejected", detail: msg }); }
      else { setNotice({ id: Date.now(), kind: "success", title: "Paper position opened", detail: `${t.side} ${t.pair} ${t.leverage}x at $${formatPrice(t.entryPrice)}`, rows: [{ label: "Pair", value: t.pair }, { label: "Side", value: t.side, tone: t.side === "LONG" ? "buy" : "sell" }, { label: "Entry", value: `$${formatPrice(t.entryPrice)}` }, { label: "Margin", value: formatUsd(t.margin) }, { label: "Leverage", value: `${t.leverage}x`, tone: "accent" }, { label: "Liq", value: `$${formatPrice(t.liquidationPrice)}`, tone: "sell" }] }); }
    } else {
      d.handleExecuteSignal({ id: `manual-${Date.now()}`, pair: a.pair, action: order.side, confidence: 0, price: entryPrice, change24h: ticker?.changePct ?? 0, reasoning: "Manual trade", dimensions: { etfFlow: 0, sentiment: 0, macro: 0, momentum: 0, treasury: 0 }, dimensionDetails: { etfFlow: { score: 0, detail: "" }, sentiment: { score: 0, detail: "" }, macro: { score: 0, detail: "" }, momentum: { score: 0, detail: "" }, treasury: { score: 0, detail: "" } }, execution: { orderType: "Market", entry: entryPrice, takeProfit: tp, stopLoss: sl, positionSize: order.quantity.toString(), riskReward: "" }, sources: ["Manual"], timeAgo: "just now" } as Signal);
      setNotice({ id: Date.now(), kind: "info", title: "Live order submitted", detail: `${order.side} ${a.pair} sent to live execution.`, rows: [{ label: "Pair", value: a.pair }, { label: "Side", value: order.side, tone: order.side === "LONG" ? "buy" : "sell" }, { label: "Entry", value: `$${formatPrice(entryPrice)}` }] });
    }
  };

  const handleClosePaperTrade = (t: PaperTrade) => {
    const mp = getMarkPrice(t); if (!mp) { setTradeError(`No mark price for ${t.pair}.`); return; }
    const pnl = (t.side === "LONG" ? mp - t.entryPrice : t.entryPrice - mp) * t.quantity;
    setPendingAction({ kind: "close", trade: t, markPrice: mp, pnl, roi: t.margin > 0 ? (pnl / t.margin) * 100 : 0 });
  };

  const executeConfirmedClose = (a: Extract<PendingTradeAction, { kind: "close" }>) => {
    const { trade, markPrice, pnl, roi } = a; paper.closeTrade(trade.id, markPrice);
    setNotice({ id: Date.now(), kind: "info", title: "Position closed", detail: `${trade.side} ${trade.pair} at $${formatPrice(markPrice)}`, rows: [{ label: "Pair", value: trade.pair }, { label: "PnL", value: `${pnl >= 0 ? "+" : ""}${formatUsd(pnl)}`, tone: pnl >= 0 ? "buy" : "sell" }, { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`, tone: roi >= 0 ? "buy" : "sell" }] });
  };

  const handleConfirm = () => { const a = pendingAction; if (!a) return; setPendingAction(null); if (a.kind === "open") executeConfirmedOpen(a); else executeConfirmedClose(a); };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const tabCfg: { id: BottomTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "orders", label: "Open Orders", icon: <ClipboardIcon size={13} />, count: d.openOrders.length },
    { id: "trades", label: "Trades", icon: <BarChartIcon size={13} />, count: 0 },
    { id: "positions", label: "Positions", icon: <BriefcaseIcon size={13} />, count: openPaperTrades.length },
    { id: "stats", label: "Paper Stats", icon: <DocumentIcon size={13} />, count: paper.stats.totalTrades },
    { id: "live", label: "Live Trades", icon: <BarChartIcon size={13} />, count: 0 },
  ];

  return (
    <div ref={rootRef} className="flex flex-col bg-background" style={{ minHeight: "100vh" }}>
      {notice && <TradeExecutionModal notice={notice} onClose={() => setNotice(null)} />}
      {pendingAction && <TradeConfirmationModal action={pendingAction} onCancel={() => setPendingAction(null)} onConfirm={handleConfirm} />}

      {isMobile ? (
        <div className="md:hidden flex-1 overflow-y-auto p-2 pb-20 space-y-2">
          <div className="h-[38vh] min-h-[240px] bg-card border border-border-default rounded-lg overflow-hidden">
            <ErrorBoundary name="Trading Chart">
              <TradingChart
                klines={d.klines}
                symbol={pair}
                currentPrice={currentPrice}
                liveSignals={d.liveSignals}
                tickerMap={d.tickerMap}
                tradeMode={tradeMode}
                onModeChange={setTradeMode}
                onPairChange={setPair}
                compact
              />
            </ErrorBoundary>
          </div>

          <div className="bg-card border border-border-default rounded-lg overflow-hidden">
            <div className="flex items-center gap-0.5 bg-inset/30 border-b border-border-default p-1 overflow-x-auto scrollbar-none">
              <button onClick={() => setBookTab("book")} className={`text-[10px] px-2.5 py-1 rounded-md whitespace-nowrap ${bookTab === "book" ? "bg-accent/15 text-accent" : "text-txt-dim"}`}>Order Book</button>
              <button onClick={() => setBookTab("trades")} className={`text-[10px] px-2.5 py-1 rounded-md whitespace-nowrap ${bookTab === "trades" ? "bg-accent/15 text-accent" : "text-txt-dim"}`}>Recent Trades</button>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {bookTab === "book" ? (
                <ErrorBoundary name="Orderbook">
                  <OrderbookDepth symbol={sodexSymbol || "vBTC_vUSDC"} coin={coin} />
                </ErrorBoundary>
              ) : (
                <ErrorBoundary name="Recent Trades">
                  <RecentTrades orders={d.orders} loading={d.ordersLoading} paperTrades={paper.trades} />
                </ErrorBoundary>
              )}
            </div>
          </div>

          <div className="bg-card border border-border-default rounded-lg overflow-hidden">
            <ErrorBoundary name="Order Form">
              <OrderForm
                pair={pair}
                coin={coin}
                currentPrice={currentPrice}
                signal={signalContext}
                isConnected={d.isConnected}
                paperBalance={paper.balance.available}
                mode={tradeMode}
                tradingType={tradingType}
                error={tradeError}
                onModeChange={setTradeMode}
                onExecute={handleExecute}
              />
            </ErrorBoundary>
          </div>

          <div className="bg-card/70 border border-border-default rounded-lg overflow-hidden">
            <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border-default bg-inset/30 overflow-x-auto scrollbar-none">
              {tabCfg.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`text-[10px] whitespace-nowrap px-2 py-1 rounded-md ${bottomTab === tab.id ? "bg-accent/15 text-accent" : "text-txt-dim"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {bottomTab === "orders" && <ErrorBoundary name="Open Orders"><OpenOrders orders={d.orders} loading={d.ordersLoading} error={d.ordersError} onCancel={d.cancelOrder} /></ErrorBoundary>}
              {bottomTab === "trades" && <ErrorBoundary name="Recent Trades"><RecentTrades orders={d.orders} loading={d.ordersLoading} paperTrades={paper.trades} /></ErrorBoundary>}
              {bottomTab === "positions" && (
                <ErrorBoundary name="Open Paper Positions">
                  {tradeMode === "paper" && paper.loaded ? (
                    openPaperTrades.length > 0 ? (
                      <div className="divide-y divide-border-default">
                        {openPaperTrades.map((t) => { const b = t.pair.split("/")[0]; const mp = currentPrices.get(b) ?? currentPrices.get(t.pair) ?? t.entryPrice; return <PosRow key={t.id} trade={t} mp={mp} active={t.pair === pair} onSel={setPair} onClose={handleClosePaperTrade} />; })}
                      </div>
                    ) : <div className="flex items-center justify-center h-28"><p className="text-xs text-txt-muted">No open positions</p></div>
                  ) : <div className="flex items-center justify-center h-28"><p className="text-xs text-txt-dim">Switch to Paper mode</p></div>}
                </ErrorBoundary>
              )}
              {bottomTab === "stats" && <ErrorBoundary name="Paper Stats">{paper.loaded ? <PaperTradingStats stats={paper.stats} balance={paper.balance} trades={paper.trades} onReset={paper.reset} /> : <div className="flex items-center justify-center h-28"><p className="text-xs text-txt-dim">Loading…</p></div>}</ErrorBoundary>}
              {bottomTab === "live" && <ErrorBoundary name="Live Trades"><RecentTradesList symbol={sodexSymbol} limit={50} /></ErrorBoundary>}
            </div>
          </div>
        </div>
      ) : (
      /* ═══ THREE-COLUMN BODY ═══ */
      <>
      <div ref={containerRef} className="h-[430px] min-h-[430px] shrink-0 flex overflow-hidden">
        {/* Column A: Chart */}
        <div className="min-w-0 flex flex-col" style={{ width: `${widths.chart}%` }}>
          <ErrorBoundary name="Trading Chart">
            <TradingChart klines={d.klines} symbol={pair} currentPrice={currentPrice} liveSignals={d.liveSignals} tickerMap={d.tickerMap} tradeMode={tradeMode} onModeChange={setTradeMode} onPairChange={setPair} />
          </ErrorBoundary>
        </div>

        {/* Resize handle: Chart ↔ Orderbook */}
        <ResizeHandle onDrag={(dx) => handleResize("chart", dx)} onDoubleClick={resetWidths} />

        {/* Column B: Orderbook + Trades */}
        <div className="min-w-0 flex flex-col" style={{ width: `${widths.book}%` }}>
          {/* Spread + Range */}
          <div className="shrink-0 px-2 py-1.5 border-b border-border-default bg-inset/30 space-y-1">
            <SpreadIndicator ticker={ticker} />
            <HighLowRange ticker={ticker} />
          </div>
          <div className="shrink-0 flex items-center border-b border-border-default bg-inset/30">
            <button onClick={() => setBookTab("book")} className={`flex-1 text-[11px] py-2 font-medium cursor-pointer transition-colors border-b-2 ${bookTab === "book" ? "text-accent border-accent bg-accent/5" : "text-txt-dim border-transparent hover:text-txt-secondary"}`}>Order Book</button>
            <button onClick={() => setBookTab("trades")} className={`flex-1 text-[11px] py-2 font-medium cursor-pointer transition-colors border-b-2 ${bookTab === "trades" ? "text-accent border-accent bg-accent/5" : "text-txt-dim border-transparent hover:text-txt-secondary"}`}>Trades</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            {bookTab === "book" ? <ErrorBoundary name="Orderbook"><OrderbookDepth symbol={sodexSymbol || "vBTC_vUSDC"} coin={coin} /></ErrorBoundary>
              : <ErrorBoundary name="Recent Trades"><RecentTrades orders={d.orders} loading={d.ordersLoading} paperTrades={paper.trades} /></ErrorBoundary>}
          </div>
        </div>

        {/* Resize handle: Orderbook ↔ Order Form */}
        <ResizeHandle onDrag={(dx) => handleResize("book", dx)} onDoubleClick={resetWidths} />

        {/* Column C: Order Form */}
        <div className="min-w-0 flex flex-col overflow-y-auto scrollbar-none" style={{ width: `${widths.form}%` }}>
          <ErrorBoundary name="Order Form">
            <OrderForm pair={pair} coin={coin} currentPrice={currentPrice} signal={signalContext} isConnected={d.isConnected} paperBalance={paper.balance.available} mode={tradeMode} tradingType={tradingType} error={tradeError} onModeChange={setTradeMode} onExecute={handleExecute} />
          </ErrorBoundary>
        </div>
      </div>

      {/* ═══ RESIZE HANDLE: Chart ↔ Bottom Panel ═══ */}
      <ResizeHandleH onDrag={handleVerticalResize} onDoubleClick={resetBottomHeight} />

      {/* ═══ BOTTOM PANEL ═══ */}
      <div className="shrink-0 border-t border-border-default bg-card/50 flex flex-col" style={{ height: `${bottomHeight}px` }}>
        <div className="flex items-center gap-0 px-3 border-b border-border-default bg-inset/30 shrink-0">
          {tabCfg.map((tab) => (
            <button key={tab.id} onClick={() => setBottomTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium cursor-pointer border-b-2 transition-colors ${bottomTab === tab.id ? "text-accent border-accent bg-accent/5" : "text-txt-dim border-transparent hover:text-txt-secondary hover:bg-elevated/20"}`}>
              {tab.icon} {tab.label}
              {tab.count > 0 && <span className={`text-[9px] px-1.5 py-0 rounded-full font-bold ${bottomTab === tab.id ? "bg-accent/20 text-accent" : "bg-elevated text-txt-faint"}`}>{tab.count}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {bottomTab === "orders" && <ErrorBoundary name="Open Orders"><OpenOrders orders={d.orders} loading={d.ordersLoading} error={d.ordersError} onCancel={d.cancelOrder} /></ErrorBoundary>}
          {bottomTab === "trades" && <ErrorBoundary name="Recent Trades"><RecentTrades orders={d.orders} loading={d.ordersLoading} paperTrades={paper.trades} /></ErrorBoundary>}
          {bottomTab === "positions" && (
            <ErrorBoundary name="Open Paper Positions">
              {tradeMode === "paper" && paper.loaded ? (
                openPaperTrades.length > 0 ? (
                  <div className="divide-y divide-border-default">
                    {openPaperTrades.map((t) => { const b = t.pair.split("/")[0]; const mp = currentPrices.get(b) ?? currentPrices.get(t.pair) ?? t.entryPrice; return <PosRow key={t.id} trade={t} mp={mp} active={t.pair === pair} onSel={setPair} onClose={handleClosePaperTrade} />; })}
                  </div>
                ) : <div className="flex items-center justify-center h-full"><div className="text-center"><BriefcaseIcon size={20} className="text-txt-faint mx-auto mb-2" /><p className="text-xs text-txt-muted">No open positions</p></div></div>
              ) : <div className="flex items-center justify-center h-full"><p className="text-xs text-txt-dim">Switch to Paper mode</p></div>}
            </ErrorBoundary>
          )}
          {bottomTab === "stats" && <ErrorBoundary name="Paper Stats">{paper.loaded ? <PaperTradingStats stats={paper.stats} balance={paper.balance} trades={paper.trades} onReset={paper.reset} /> : <div className="flex items-center justify-center h-full"><p className="text-xs text-txt-dim">Loading…</p></div>}</ErrorBoundary>}
          {bottomTab === "live" && <ErrorBoundary name="Live Trades"><RecentTradesList symbol={sodexSymbol} limit={50} /></ErrorBoundary>}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════ */

function TradeConfirmationModal({ action, onCancel, onConfirm }: { action: PendingTradeAction; onCancel: () => void; onConfirm: () => void }) {
  const isOpen = action.kind === "open";
  const side = isOpen ? action.order.side : action.trade.side;
  const sideTone = side === "LONG" ? "text-buy" : "text-sell";
  const rows = isOpen
    ? [{ l: "Pair", v: action.pair }, { l: "Side", v: side }, { l: "Entry", v: `$${formatPrice(action.entryPrice)}` }, { l: "Margin", v: formatUsd(action.order.margin) }, { l: "Leverage", v: `${action.order.leverage}x` }, { l: "Liq", v: `$${formatPrice(action.liquidationPrice)}` }]
    : [{ l: "Pair", v: action.trade.pair }, { l: "Side", v: side }, { l: "Entry", v: `$${formatPrice(action.trade.entryPrice)}` }, { l: "Exit", v: `$${formatPrice(action.markPrice)}` }, { l: "PnL", v: `${action.pnl >= 0 ? "+" : ""}${formatUsd(action.pnl)}` }, { l: "ROI", v: `${action.roi >= 0 ? "+" : ""}${action.roi.toFixed(2)}%` }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-accent/30 bg-panel">
        <div className="border-b border-border-default bg-accent/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Action Required</p>
          <h3 className="mt-1 text-lg font-bold text-txt-primary">{isOpen ? "Confirm Entry" : "Confirm Exit"}</h3>
        </div>
        <div className="p-5"><div className="grid grid-cols-2 gap-2">{rows.map((r) => (<div key={r.l} className="rounded-lg border border-border-default bg-inset/40 px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-txt-faint">{r.l}</p><p className={`mt-0.5 text-sm font-bold font-mono ${r.l === "Side" ? sideTone : "text-txt-primary"}`}>{r.v}</p></div>))}</div></div>
        <div className="flex items-center justify-between gap-3 border-t border-border-default px-5 py-4">
          <button onClick={onCancel} className="rounded-lg border border-border-default bg-inset px-4 py-2 text-xs font-semibold text-txt-secondary cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-xs font-bold cursor-pointer backdrop-blur-sm transition-all ${isOpen ? "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50" : "bg-sell/10 text-sell border border-sell/30 hover:bg-sell/20 hover:border-sell/50"}`}>{isOpen ? "Confirm Open" : "Confirm Close"}</button>
        </div>
      </div>
    </div>
  );
}

function TradeExecutionModal({ notice, onClose }: { notice: TradeNotice; onClose: () => void }) {
  const tone = notice.kind === "error" ? "text-sell" : notice.kind === "success" ? "text-buy" : "text-accent";
  const bd = notice.kind === "error" ? "border-sell/30" : notice.kind === "success" ? "border-buy/30" : "border-accent/30";
  const bg = notice.kind === "error" ? "bg-sell/10" : notice.kind === "success" ? "bg-buy/10" : "bg-accent/10";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md overflow-hidden rounded-xl border ${bd} bg-panel`}>
        <div className={`px-5 py-4 ${bg} border-b ${bd}`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className={`text-xs font-bold uppercase tracking-wider ${tone}`}>{notice.kind === "error" ? "Failed" : "Confirmed"}</p><h3 className="mt-1 text-lg font-bold text-txt-primary">{notice.title}</h3><p className="mt-1 text-xs text-txt-secondary">{notice.detail}</p></div>
            <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-txt-faint hover:text-txt-secondary cursor-pointer">Close</button>
          </div>
        </div>
        {notice.rows && notice.rows.length > 0 && <div className="grid grid-cols-2 gap-2 p-5">{notice.rows.map((r) => (<div key={r.label} className="rounded-lg border border-border-default bg-inset/50 px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-txt-faint">{r.label}</p><p className={`mt-0.5 text-sm font-bold font-mono ${r.tone === "buy" ? "text-buy" : r.tone === "sell" ? "text-sell" : r.tone === "accent" ? "text-accent" : "text-txt-primary"}`}>{r.value}</p></div>))}</div>}
        <div className="flex justify-end border-t border-border-default px-5 py-4"><button onClick={onClose} className={`rounded-lg px-4 py-2 text-xs font-bold cursor-pointer backdrop-blur-sm transition-all ${notice.kind === "error" ? "bg-sell/10 text-sell border border-sell/30 hover:bg-sell/20 hover:border-sell/50" : "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50"}`}>Got it</button></div>
      </div>
    </div>
  );
}

function PosRow({ trade, mp, active, onSel, onClose }: { trade: PaperTrade; mp: number; active: boolean; onSel: (p: string) => void; onClose: (t: PaperTrade) => void }) {
  const pnl = (trade.side === "LONG" ? mp - trade.entryPrice : trade.entryPrice - mp) * trade.quantity;
  const pnlPct = trade.margin > 0 ? (pnl / trade.margin) * 100 : 0;
  const isProfit = pnl >= 0;
  const liqDist = trade.side === "LONG" ? ((mp - trade.liquidationPrice) / mp) * 100 : ((trade.liquidationPrice - mp) / mp) * 100;
  return (
    <div className="px-4 py-2.5 hover:bg-elevated/10 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.side === "LONG" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>{trade.side}</span>
          <button onClick={() => onSel(trade.pair)} className={`text-xs font-bold truncate cursor-pointer ${active ? "text-accent" : "text-txt-primary hover:text-accent"}`}>{trade.pair}</button>
          <span className="text-[9px] text-accent font-mono">{trade.leverage}x</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right"><p className={`text-xs font-bold font-mono ${isProfit ? "text-buy" : "text-sell"}`}>{isProfit ? "+" : ""}{formatUsd(pnl)}</p><p className={`text-[9px] font-mono ${isProfit ? "text-buy/70" : "text-sell/70"}`}>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</p></div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-txt-faint">
            <span>E <span className="text-txt-secondary">${formatPrice(trade.entryPrice)}</span></span>
            <span className={liqDist < 5 ? "text-sell font-bold" : liqDist < 15 ? "text-hold" : ""}>Liq {liqDist.toFixed(1)}%</span>
          </div>
          <button onClick={() => onClose(trade)} className="text-[10px] py-1 px-2.5 rounded border border-sell/25 bg-sell/10 text-sell cursor-pointer font-semibold">Close</button>
        </div>
      </div>
    </div>
  );
}
