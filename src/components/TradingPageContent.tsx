"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { Signal } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import TradingChart from "@/components/TradingChart";
import OrderForm from "@/components/OrderForm";
import OrderbookDepth from "@/components/OrderbookDepth";
import OpenOrders from "@/components/OpenOrders";
import RecentTrades from "@/components/RecentTrades";
import PaperTradingStats from "@/components/PaperTradingStats";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import {
  ClipboardIcon,
  BarChartIcon,
  BriefcaseIcon,
  DocumentIcon,
} from "@/components/ui/icons";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import type { PaperTrade } from "@/lib/hooks/usePaperTrading";

/* ── Types ── */

type TradeNotice = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  detail: string;
  rows?: { label: string; value: string; tone?: "buy" | "sell" | "accent" | "muted" }[];
};

type TradeOrderInput = {
  side: "LONG" | "SHORT";
  leverage: number;
  margin: number;
  quantity: number;
  takeProfit: string;
  stopLoss: string;
};

type PendingTradeAction =
  | { kind: "open"; mode: "paper" | "live"; pair: string; order: TradeOrderInput; entryPrice: number; takeProfit: number; stopLoss: number; liquidationPrice: number }
  | { kind: "close"; trade: PaperTrade; markPrice: number; pnl: number; roi: number };

type BookTab = "book" | "trades";
type BottomTab = "orders" | "trades" | "positions" | "stats";

/* ── Helpers ── */

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : abs.toFixed(2);
  return `${value < 0 ? "-" : ""}$${formatted}`;
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
  const paper = usePaperTrading();
  const checkPaperTpSl = paper.checkTpSl;

  const tradingTypeParam = searchParams.get("type");
  const tradingType: TradingType | null =
    tradingTypeParam && ["scalping", "intraday", "swing", "position"].includes(tradingTypeParam)
      ? tradingTypeParam as TradingType : null;

  const signalContext = useMemo(() => {
    const signalId = searchParams.get("signal");
    if (!signalId) return null;
    return d.liveSignals.find((s) => s.id === signalId) ?? null;
  }, [searchParams, d.liveSignals]);

  useEffect(() => {
    const urlPair = searchParams.get("pair");
    if (signalContext) setPair(signalContext.pair);
    else if (urlPair) setPair(urlPair);
  }, [searchParams, signalContext]);

  const coin = pair.split("/")[0];
  const sodexSymbol = pairToSodexSymbol(pair);
  const ticker = sodexSymbol ? d.tickerMap.get(sodexSymbol) : undefined;
  const currentPrice = ticker ? parseFloat(ticker.lastPx) : null;

  const currentPrices = useMemo(() => {
    const base = pair.split("/")[0];
    const prices = new Map<string, number>();
    if (currentPrice && Number.isFinite(currentPrice)) { prices.set(base, currentPrice); prices.set(pair, currentPrice); }
    for (const t of d.tickers ?? []) {
      const mp = parseFloat(t.lastPx);
      if (!Number.isFinite(mp) || mp <= 0) continue;
      const [rb, rq] = t.symbol.split("_");
      const tb = rb?.replace(/^v/, "");
      const tq = rq?.replace(/^v/, "");
      if (!tb) continue;
      prices.set(tb, mp);
      if (tq) prices.set(`${tb}/${tq}`, mp);
    }
    return prices;
  }, [currentPrice, d.tickers, pair]);

  useEffect(() => { if (currentPrices.size > 0) checkPaperTpSl(currentPrices); }, [currentPrices, checkPaperTpSl]);
  useEffect(() => { if (paper.error) setTradeError(paper.error); }, [paper.error]);
  useEffect(() => { setTradeError(null); }, [pair, tradeMode]);


  const openPaperTrades = useMemo(() => paper.trades.filter((t) => t.status === "OPEN"), [paper.trades]);

  const getMarkPrice = (trade: PaperTrade) => {
    const base = trade.pair.split("/")[0];
    return currentPrices.get(base) ?? currentPrices.get(trade.pair) ?? null;
  };

  const calculateLiquidationPrice = (entryPrice: number, side: "LONG" | "SHORT", leverage: number) => {
    const mm = 0.005;
    return side === "LONG" ? entryPrice * (1 - 1 / leverage + mm) : entryPrice * (1 + 1 / leverage - mm);
  };

  /* ── Handlers (logic unchanged) ── */

  const handleExecute = (order: TradeOrderInput) => {
    const entryPrice = currentPrice || 0;
    const tp = parseFloat(order.takeProfit) || 0;
    const sl = parseFloat(order.stopLoss) || 0;
    setTradeError(null);
    if (!entryPrice) { setTradeError("Market price is not available."); return; }
    setPendingAction({ kind: "open", mode: tradeMode, pair, order, entryPrice, takeProfit: tp, stopLoss: sl, liquidationPrice: calculateLiquidationPrice(entryPrice, order.side, order.leverage) });
  };

  const executeConfirmedOpen = (action: Extract<PendingTradeAction, { kind: "open" }>) => {
    const { order, entryPrice, takeProfit: tp, stopLoss: sl } = action;
    if (action.mode === "paper") {
      const trade = paper.openTrade({ pair: action.pair, side: order.side, leverage: order.leverage, margin: order.margin, entryPrice, takeProfit: tp, stopLoss: sl, signalId: signalContext?.id, confidence: signalContext?.confidence, tradingType: tradingType ?? undefined });
      if (!trade) {
        const msg = paper.error ?? "Paper trade rejected.";
        setTradeError(msg);
        setNotice({ id: Date.now(), kind: "error", title: "Trade rejected", detail: msg });
      } else {
        setNotice({ id: Date.now(), kind: "success", title: "Paper position opened", detail: `${trade.side} ${trade.pair} ${trade.leverage}x at $${formatPrice(trade.entryPrice)}`, rows: [
          { label: "Pair", value: trade.pair }, { label: "Side", value: trade.side, tone: trade.side === "LONG" ? "buy" : "sell" },
          { label: "Entry", value: `$${formatPrice(trade.entryPrice)}` }, { label: "Margin", value: formatUsd(trade.margin) },
          { label: "Leverage", value: `${trade.leverage}x`, tone: "accent" }, { label: "Liquidation", value: `$${formatPrice(trade.liquidationPrice)}`, tone: "sell" },
        ]});
      }
    } else {
      d.handleExecuteSignal({ id: `manual-${Date.now()}`, pair: action.pair, action: order.side, confidence: 0, price: entryPrice, change24h: ticker?.changePct ?? 0, reasoning: "Manual trade",
        dimensions: { etfFlow: 0, sentiment: 0, macro: 0, momentum: 0, treasury: 0 },
        dimensionDetails: { etfFlow: { score: 0, detail: "" }, sentiment: { score: 0, detail: "" }, macro: { score: 0, detail: "" }, momentum: { score: 0, detail: "" }, treasury: { score: 0, detail: "" } },
        execution: { orderType: "Market", entry: entryPrice, takeProfit: tp, stopLoss: sl, positionSize: order.quantity.toString(), riskReward: "" },
        sources: ["Manual"], timeAgo: "just now",
      } as Signal);
      setNotice({ id: Date.now(), kind: "info", title: "Live order submitted", detail: `${order.side} ${action.pair} sent to live execution.`, rows: [
        { label: "Pair", value: action.pair }, { label: "Side", value: order.side, tone: order.side === "LONG" ? "buy" : "sell" },
        { label: "Entry", value: `$${formatPrice(entryPrice)}` }, { label: "Size", value: order.quantity.toFixed(5) },
        { label: "TP", value: tp > 0 ? `$${formatPrice(tp)}` : "—" }, { label: "SL", value: sl > 0 ? `$${formatPrice(sl)}` : "—" },
      ]});
    }
  };

  const handleClosePaperTrade = (trade: PaperTrade) => {
    const markPrice = getMarkPrice(trade);
    if (!markPrice) { setTradeError(`No mark price for ${trade.pair}.`); return; }
    const pnl = (trade.side === "LONG" ? markPrice - trade.entryPrice : trade.entryPrice - markPrice) * trade.quantity;
    setPendingAction({ kind: "close", trade, markPrice, pnl, roi: trade.margin > 0 ? (pnl / trade.margin) * 100 : 0 });
  };

  const executeConfirmedClose = (action: Extract<PendingTradeAction, { kind: "close" }>) => {
    const { trade, markPrice, pnl, roi } = action;
    paper.closeTrade(trade.id, markPrice);
    setNotice({ id: Date.now(), kind: "info", title: "Position closed", detail: `${trade.side} ${trade.pair} at $${formatPrice(markPrice)}`, rows: [
      { label: "Pair", value: trade.pair }, { label: "Exit", value: `$${formatPrice(markPrice)}` },
      { label: "PnL", value: `${pnl >= 0 ? "+" : ""}${formatUsd(pnl)}`, tone: pnl >= 0 ? "buy" : "sell" },
      { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`, tone: roi >= 0 ? "buy" : "sell" },
    ]});
  };

  const handleConfirmPendingAction = () => {
    const a = pendingAction; if (!a) return; setPendingAction(null);
    if (a.kind === "open") executeConfirmedOpen(a); else executeConfirmedClose(a);
  };


  const tabCfg: { id: BottomTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "orders", label: "Open Orders", icon: <ClipboardIcon size={13} />, count: d.openOrders.length },
    { id: "trades", label: "Trades", icon: <BarChartIcon size={13} />, count: 0 },
    { id: "positions", label: "Positions", icon: <BriefcaseIcon size={13} />, count: openPaperTrades.length },
    { id: "stats", label: "Paper Stats", icon: <DocumentIcon size={13} />, count: paper.stats.totalTrades },
  ];

  /* ═══ RENDER ═══ */

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Modals */}
      {notice && <TradeExecutionModal notice={notice} onClose={() => setNotice(null)} />}
      {pendingAction && <TradeConfirmationModal action={pendingAction} onCancel={() => setPendingAction(null)} onConfirm={handleConfirmPendingAction} />}


      {/* ═══ THREE-COLUMN BODY — fills full height ═══ */}
      <div className="flex-1 min-h-0 flex">
        {/* ─── COLUMN A: Chart (~65%) ─── */}
        <div className="flex-[11] min-w-0 flex flex-col border-r border-border-default">
          <ErrorBoundary name="Trading Chart">
            <TradingChart klines={d.klines} symbol={pair} currentPrice={currentPrice} liveSignals={d.liveSignals} tickerMap={d.tickerMap} tradeMode={tradeMode} onModeChange={setTradeMode} onPairChange={setPair} />
          </ErrorBoundary>
        </div>

        {/* ─── COLUMN B: Orderbook + Trades (~20%) ─── */}
        <div className="flex-[4] min-w-0 flex flex-col border-r border-border-default bg-surface/10">
          {/* Tab switcher */}
          <div className="shrink-0 flex items-center border-b border-border-default bg-inset/30">
            <button onClick={() => setBookTab("book")} className={`flex-1 text-[11px] py-2 font-medium cursor-pointer transition-colors border-b-2 ${bookTab === "book" ? "text-accent border-accent bg-accent/5" : "text-txt-dim border-transparent hover:text-txt-secondary"}`}>Order Book</button>
            <button onClick={() => setBookTab("trades")} className={`flex-1 text-[11px] py-2 font-medium cursor-pointer transition-colors border-b-2 ${bookTab === "trades" ? "text-accent border-accent bg-accent/5" : "text-txt-dim border-transparent hover:text-txt-secondary"}`}>Trades</button>
          </div>
          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
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

        {/* ─── COLUMN C: Order Form (~15%) ─── */}
        <div className="flex-[4] min-w-0 flex flex-col overflow-y-auto scrollbar-none">
          <ErrorBoundary name="Order Form">
            <OrderForm pair={pair} coin={coin} currentPrice={currentPrice} signal={signalContext} isConnected={d.isConnected} paperBalance={paper.balance.available} mode={tradeMode} tradingType={tradingType} error={tradeError} onModeChange={setTradeMode} onExecute={handleExecute} />
          </ErrorBoundary>
        </div>
      </div>

      {/* ═══ [3] BOTTOM PANEL ═══ */}
      <div className="shrink-0 h-[200px] border-t border-border-default bg-card/50 flex flex-col">
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
                    {openPaperTrades.map((trade) => {
                      const base = trade.pair.split("/")[0];
                      const mp = currentPrices.get(base) ?? currentPrices.get(trade.pair) ?? trade.entryPrice;
                      return <OpenPaperPositionRow key={trade.id} trade={trade} markPrice={mp} isActive={trade.pair === pair} onSelect={setPair} onClose={handleClosePaperTrade} />;
                    })}
                  </div>
                ) : <div className="flex items-center justify-center h-full"><div className="text-center"><BriefcaseIcon size={20} className="text-txt-faint mx-auto mb-2" /><p className="text-xs text-txt-muted">No open positions</p></div></div>
              ) : <div className="flex items-center justify-center h-full"><p className="text-xs text-txt-dim">Switch to Paper mode</p></div>}
            </ErrorBoundary>
          )}
          {bottomTab === "stats" && (
            <ErrorBoundary name="Paper Stats">
              {paper.loaded ? <PaperTradingStats stats={paper.stats} balance={paper.balance} trades={paper.trades} onReset={paper.reset} /> : <div className="flex items-center justify-center h-full"><p className="text-xs text-txt-dim">Loading…</p></div>}
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MODALS & SUB-COMPONENTS
   ══════════════════════════════════════════════════════ */

function TradeConfirmationModal({ action, onCancel, onConfirm }: { action: PendingTradeAction; onCancel: () => void; onConfirm: () => void }) {
  const isOpen = action.kind === "open";
  const side = isOpen ? action.order.side : action.trade.side;
  const sideTone = side === "LONG" ? "text-buy" : "text-sell";
  const rows = isOpen
    ? [{ l: "Pair", v: action.pair }, { l: "Side", v: side }, { l: "Entry", v: `$${formatPrice(action.entryPrice)}` }, { l: "Margin", v: formatUsd(action.order.margin) }, { l: "Leverage", v: `${action.order.leverage}x` }, { l: "Liquidation", v: `$${formatPrice(action.liquidationPrice)}` }, { l: "TP", v: action.takeProfit > 0 ? `$${formatPrice(action.takeProfit)}` : "—" }, { l: "SL", v: action.stopLoss > 0 ? `$${formatPrice(action.stopLoss)}` : "—" }]
    : [{ l: "Pair", v: action.trade.pair }, { l: "Side", v: side }, { l: "Entry", v: `$${formatPrice(action.trade.entryPrice)}` }, { l: "Exit", v: `$${formatPrice(action.markPrice)}` }, { l: "Margin", v: formatUsd(action.trade.margin) }, { l: "PnL", v: `${action.pnl >= 0 ? "+" : ""}${formatUsd(action.pnl)}` }, { l: "ROI", v: `${action.roi >= 0 ? "+" : ""}${action.roi.toFixed(2)}%` }, { l: "Status", v: "Manual close" }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-accent/30 bg-panel shadow-2xl">
        <div className="border-b border-border-default bg-accent/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Action Required</p>
          <h3 className="mt-1 text-lg font-bold text-txt-primary">{isOpen ? "Confirm Entry" : "Confirm Exit"}</h3>
        </div>
        <div className="p-5"><div className="grid grid-cols-2 gap-2">{rows.map((r) => (<div key={r.l} className="rounded-lg border border-border-default bg-inset/40 px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-txt-faint">{r.l}</p><p className={`mt-0.5 text-sm font-bold font-mono ${r.l === "Side" ? sideTone : "text-txt-primary"}`}>{r.v}</p></div>))}</div></div>
        <div className="flex items-center justify-between gap-3 border-t border-border-default px-5 py-4">
          <button onClick={onCancel} className="rounded-lg border border-border-default bg-inset px-4 py-2 text-xs font-semibold text-txt-secondary cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-xs font-bold text-white cursor-pointer ${isOpen ? "bg-accent" : "bg-sell"}`}>{isOpen ? "Confirm Open" : "Confirm Close"}</button>
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
      <div className={`w-full max-w-md overflow-hidden rounded-xl border ${bd} bg-panel shadow-2xl`}>
        <div className={`px-5 py-4 ${bg} border-b ${bd}`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className={`text-xs font-bold uppercase tracking-wider ${tone}`}>{notice.kind === "error" ? "Failed" : "Confirmed"}</p><h3 className="mt-1 text-lg font-bold text-txt-primary">{notice.title}</h3><p className="mt-1 text-xs text-txt-secondary">{notice.detail}</p></div>
            <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-txt-faint hover:text-txt-secondary cursor-pointer">Close</button>
          </div>
        </div>
        {notice.rows && notice.rows.length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-5">{notice.rows.map((r) => (<div key={r.label} className="rounded-lg border border-border-default bg-inset/50 px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-txt-faint">{r.label}</p><p className={`mt-0.5 text-sm font-bold font-mono ${r.tone === "buy" ? "text-buy" : r.tone === "sell" ? "text-sell" : r.tone === "accent" ? "text-accent" : "text-txt-primary"}`}>{r.value}</p></div>))}</div>
        )}
        <div className="flex justify-end border-t border-border-default px-5 py-4"><button onClick={onClose} className={`rounded-lg px-4 py-2 text-xs font-bold cursor-pointer ${notice.kind === "error" ? "bg-sell text-white" : "bg-accent text-white"}`}>Got it</button></div>
      </div>
    </div>
  );
}

function OpenPaperPositionRow({ trade, markPrice, isActive, onSelect, onClose }: { trade: PaperTrade; markPrice: number; isActive: boolean; onSelect: (p: string) => void; onClose: (t: PaperTrade) => void }) {
  const pnl = (trade.side === "LONG" ? markPrice - trade.entryPrice : trade.entryPrice - markPrice) * trade.quantity;
  const pnlPct = trade.margin > 0 ? (pnl / trade.margin) * 100 : 0;
  const isProfit = pnl >= 0;
  const liqDist = trade.side === "LONG" ? ((markPrice - trade.liquidationPrice) / markPrice) * 100 : ((trade.liquidationPrice - markPrice) / markPrice) * 100;

  return (
    <div className="px-4 py-2.5 hover:bg-elevated/10 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.side === "LONG" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>{trade.side}</span>
          <button onClick={() => onSelect(trade.pair)} className={`text-xs font-bold truncate cursor-pointer ${isActive ? "text-accent" : "text-txt-primary hover:text-accent"}`}>{trade.pair}</button>
          <span className="text-[9px] text-accent font-mono">{trade.leverage}x</span>
          <span className="text-[9px] text-txt-faint">M {formatUsd(trade.margin)}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right"><p className={`text-xs font-bold font-mono ${isProfit ? "text-buy" : "text-sell"}`}>{isProfit ? "+" : ""}{formatUsd(pnl)}</p><p className={`text-[9px] font-mono ${isProfit ? "text-buy/70" : "text-sell/70"}`}>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</p></div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-txt-faint">
            <span>E <span className="text-txt-secondary">${formatPrice(trade.entryPrice)}</span></span>
            <span>TP <span className="text-buy">{trade.takeProfit > 0 ? `$${formatPrice(trade.takeProfit)}` : "—"}</span></span>
            <span>SL <span className="text-sell">{trade.stopLoss > 0 ? `$${formatPrice(trade.stopLoss)}` : "—"}</span></span>
            <span className={liqDist < 5 ? "text-sell font-bold" : liqDist < 15 ? "text-hold" : ""}>Liq {liqDist.toFixed(1)}%</span>
          </div>
          <button onClick={() => onClose(trade)} className="text-[10px] py-1 px-2.5 rounded border border-sell/25 bg-sell/10 text-sell cursor-pointer font-semibold">Close</button>
        </div>
      </div>
    </div>
  );
}
