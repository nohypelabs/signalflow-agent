"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { Signal } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TradingChart from "@/components/TradingChart";
import OrderForm from "@/components/OrderForm";
import OrderbookDepth from "@/components/OrderbookDepth";
import OpenOrders from "@/components/OpenOrders";
import RecentTrades from "@/components/RecentTrades";
import PaperTradingStats from "@/components/PaperTradingStats";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { usePaperTrading } from "@/lib/hooks/usePaperTrading";
import type { PaperTrade } from "@/lib/hooks/usePaperTrading";

type TradeNotice = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  detail: string;
  rows?: { label: string; value: string; tone?: "buy" | "sell" | "accent" | "muted" }[];
};

export default function TradingPageContent() {
  const d = useDashboard();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState("BTC/USDC");
  const [tradeMode, setTradeMode] = useState<"paper" | "live">("paper");
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<TradeNotice | null>(null);
  const paper = usePaperTrading();
  const checkPaperTpSl = paper.checkTpSl;

  // Read trading type from URL
  const tradingTypeParam = searchParams.get("type");
  const tradingType: TradingType | null =
    tradingTypeParam && ["scalping", "intraday", "swing", "position"].includes(tradingTypeParam)
      ? tradingTypeParam as TradingType
      : null;

  // Pre-fill from signal context
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
    if (currentPrice && Number.isFinite(currentPrice)) {
      prices.set(base, currentPrice);
      prices.set(pair, currentPrice);
    }

    for (const t of d.tickers ?? []) {
      const markPrice = parseFloat(t.lastPx);
      if (!Number.isFinite(markPrice) || markPrice <= 0) continue;
      const [rawBase, rawQuote] = t.symbol.split("_");
      const tickerBase = rawBase?.replace(/^v/, "");
      const tickerQuote = rawQuote?.replace(/^v/, "");
      if (!tickerBase) continue;
      prices.set(tickerBase, markPrice);
      if (tickerQuote) prices.set(`${tickerBase}/${tickerQuote}`, markPrice);
    }
    return prices;
  }, [currentPrice, d.tickers, pair]);

  // Check TP/SL for paper trades every tick.
  useEffect(() => {
    if (currentPrices.size > 0) checkPaperTpSl(currentPrices);
  }, [currentPrices, checkPaperTpSl]);

  useEffect(() => {
    if (paper.error) setTradeError(paper.error);
  }, [paper.error]);

  useEffect(() => {
    setTradeError(null);
  }, [pair, tradeMode]);

  const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"];
  const openPaperTrades = useMemo(() => paper.trades.filter((trade) => trade.status === "OPEN"), [paper.trades]);

  const getMarkPrice = (trade: PaperTrade) => {
    const base = trade.pair.split("/")[0];
    return currentPrices.get(base) ?? currentPrices.get(trade.pair) ?? null;
  };

  const handleExecute = (order: { side: "LONG" | "SHORT"; leverage: number; margin: number; quantity: number; takeProfit: string; stopLoss: string }) => {
    const entryPrice = currentPrice || 0;
    const tp = parseFloat(order.takeProfit) || 0;
    const sl = parseFloat(order.stopLoss) || 0;
    setTradeError(null);

    if (!entryPrice) {
      setTradeError("Market price is not available.");
      return;
    }

    if (tradeMode === "paper") {
      const trade = paper.openTrade({
        pair,
        side: order.side,
        leverage: order.leverage,
        margin: order.margin,
        entryPrice,
        takeProfit: tp,
        stopLoss: sl,
        signalId: signalContext?.id,
        confidence: signalContext?.confidence,
        tradingType: tradingType ?? undefined,
      });
      if (!trade) {
        const message = paper.error ?? "Paper trade rejected.";
        setTradeError(message);
        setNotice({
          id: Date.now(),
          kind: "error",
          title: "Trade rejected",
          detail: message,
        });
      } else {
        setNotice({
          id: Date.now(),
          kind: "success",
          title: "Paper position opened",
          detail: `${trade.side} ${trade.pair} ${trade.leverage}x opened at $${formatPrice(trade.entryPrice)} with $${trade.margin.toFixed(2)} margin.`,
          rows: [
            { label: "Pair", value: trade.pair },
            { label: "Side", value: trade.side, tone: trade.side === "LONG" ? "buy" : "sell" },
            { label: "Entry", value: `$${formatPrice(trade.entryPrice)}` },
            { label: "Margin", value: formatUsd(trade.margin) },
            { label: "Leverage", value: `${trade.leverage}x`, tone: "accent" },
            { label: "Liquidation", value: `$${formatPrice(trade.liquidationPrice)}`, tone: "sell" },
          ],
        });
      }
    } else {
      // Live trade via SoDEX
      d.handleExecuteSignal({
        id: `manual-${Date.now()}`,
        pair,
        action: order.side,
        confidence: 0,
        price: entryPrice,
        change24h: ticker?.changePct ?? 0,
        reasoning: "Manual trade",
        dimensions: { etfFlow: 0, sentiment: 0, macro: 0, momentum: 0, treasury: 0 },
        dimensionDetails: {
          etfFlow: { score: 0, detail: "" },
          sentiment: { score: 0, detail: "" },
          macro: { score: 0, detail: "" },
          momentum: { score: 0, detail: "" },
          treasury: { score: 0, detail: "" },
        },
        execution: {
          orderType: "Market",
          entry: entryPrice,
          takeProfit: tp,
          stopLoss: sl,
          positionSize: order.quantity.toString(),
          riskReward: "",
        },
        sources: ["Manual"],
        timeAgo: "just now",
      } as Signal);
    }
  };

  const handleClosePaperTrade = (trade: PaperTrade) => {
    const markPrice = getMarkPrice(trade);
    if (!markPrice) {
      const message = `No mark price available for ${trade.pair}.`;
      setTradeError(message);
      setNotice({ id: Date.now(), kind: "error", title: "Close rejected", detail: message });
      return;
    }

    paper.closeTrade(trade.id, markPrice);
    const priceChange = trade.side === "LONG"
      ? markPrice - trade.entryPrice
      : trade.entryPrice - markPrice;
    const pnl = priceChange * trade.quantity;
    setNotice({
      id: Date.now(),
      kind: "info",
      title: "Paper position closed",
      detail: `${trade.side} ${trade.pair} closed at $${formatPrice(markPrice)}.`,
      rows: [
        { label: "Pair", value: trade.pair },
        { label: "Exit", value: `$${formatPrice(markPrice)}` },
        { label: "PnL", value: `${pnl >= 0 ? "+" : ""}${formatUsd(pnl)}`, tone: pnl >= 0 ? "buy" : "sell" },
        { label: "ROI", value: `${pnl >= 0 ? "+" : ""}${((pnl / trade.margin) * 100).toFixed(2)}%`, tone: pnl >= 0 ? "buy" : "sell" },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Trading</h2>
          <Badge variant="live" size="sm">LIVE</Badge>
          {tradeMode === "paper" && (
            <span className="text-[9px] px-2 py-0.5 rounded bg-accent/15 text-accent font-bold">📝 PAPER MODE</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {d.isConnected ? (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
              <span className="text-txt-muted font-mono">{d.shortAddress}</span>
            </div>
          ) : (
            <span className="text-[10px] text-hold">Connect wallet for live trading</span>
          )}
        </div>
      </div>

      {notice && <TradeExecutionModal notice={notice} onClose={() => setNotice(null)} />}

      {/* Wallet bar */}
      {d.isConnected && (
        <Card padding="sm" className="bg-inset/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-txt-dim uppercase tracking-wider">Wallet</span>
              <span className="text-xs font-mono text-txt-primary font-semibold">{d.shortAddress}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-txt-dim">
                Network: <span className="text-txt-secondary">ValueChain Mainnet</span>
              </span>
              <span className="text-[10px] text-txt-dim">
                Orders: <span className="text-txt-secondary">{d.openOrders.length}</span>
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Pair selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-txt-dim uppercase tracking-wider">Pair:</span>
        <div className="flex items-center gap-0.5 bg-inset border border-border-default rounded-lg p-0.5">
          {pairs.map((p) => (
            <button
              key={p}
              onClick={() => setPair(p)}
              className={`text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer ${
                pair === p ? "bg-elevated text-accent" : "text-txt-dim hover:text-txt-secondary"
              }`}
            >
              {p.replace("/USDC", "")}
            </button>
          ))}
        </div>
        {currentPrice && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-txt-primary">
              ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: coin === "BTC" ? 0 : 2 })}
            </span>
            {ticker && (
              <span className={`text-xs font-mono font-semibold ${ticker.changePct >= 0 ? "text-buy" : "text-sell"}`}>
                {ticker.changePct >= 0 ? "+" : ""}{ticker.changePct.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Chart + Orders */}
        <div className="xl:col-span-2 space-y-4">
          <ErrorBoundary name="Trading Chart">
            <div className="h-[450px] flex flex-col">
              <TradingChart
                klines={d.klines}
                symbol={pair}
                currentPrice={currentPrice}
                liveSignals={d.liveSignals}
                tickerMap={d.tickerMap}
              />
            </div>
          </ErrorBoundary>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ErrorBoundary name="Open Orders">
              <OpenOrders
                orders={d.orders}
                loading={d.ordersLoading}
                error={d.ordersError}
                onCancel={d.cancelOrder}
              />
            </ErrorBoundary>
            <ErrorBoundary name="Recent Trades">
              <RecentTrades orders={d.orders} loading={d.ordersLoading} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right: Order Form + Paper Stats + Orderbook */}
        <div className="space-y-4">
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

          {tradeMode === "paper" && paper.loaded && (
            <ErrorBoundary name="Open Paper Positions">
              <OpenPaperPositionsPanel
                trades={openPaperTrades}
                currentPair={pair}
                currentPrices={currentPrices}
                onSelectPair={setPair}
                onClose={handleClosePaperTrade}
              />
            </ErrorBoundary>
          )}

          {tradeMode === "paper" && paper.loaded && (
            <ErrorBoundary name="Paper Trading">
              <PaperTradingStats
                stats={paper.stats}
                balance={paper.balance}
                trades={paper.trades}
                onReset={paper.reset}
              />
            </ErrorBoundary>
          )}

          <ErrorBoundary name="Orderbook">
            <OrderbookDepth
              symbol={sodexSymbol || "vBTC_vUSDC"}
              coin={coin}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : abs.toFixed(2);
  return `${value < 0 ? "-" : ""}$${formatted}`;
}

function TradeExecutionModal({ notice, onClose }: { notice: TradeNotice; onClose: () => void }) {
  const toneClass = notice.kind === "error" ? "text-sell" : notice.kind === "success" ? "text-buy" : "text-accent";
  const borderClass = notice.kind === "error" ? "border-sell/30" : notice.kind === "success" ? "border-buy/30" : "border-accent/30";
  const bgClass = notice.kind === "error" ? "bg-sell/10" : notice.kind === "success" ? "bg-buy/10" : "bg-accent/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md overflow-hidden rounded-xl border ${borderClass} bg-panel shadow-2xl`}>
        <div className={`px-5 py-4 ${bgClass} border-b ${borderClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${toneClass}`}>
                {notice.kind === "error" ? "Execution Failed" : "Execution Confirmed"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-txt-primary">{notice.title}</h3>
              <p className="mt-1 text-xs text-txt-secondary leading-relaxed">{notice.detail}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md px-2 py-1 text-xs text-txt-faint hover:bg-elevated hover:text-txt-secondary cursor-pointer"
              aria-label="Close execution notification"
            >
              Close
            </button>
          </div>
        </div>

        {notice.rows && notice.rows.length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-5">
            {notice.rows.map((row) => (
              <div key={row.label} className="rounded-lg border border-border-default bg-inset/50 px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-txt-faint">{row.label}</p>
                <p className={`mt-0.5 text-sm font-bold font-mono ${
                  row.tone === "buy" ? "text-buy" : row.tone === "sell" ? "text-sell" : row.tone === "accent" ? "text-accent" : "text-txt-primary"
                }`}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border-default px-5 py-4">
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-xs font-bold cursor-pointer ${
              notice.kind === "error"
                ? "bg-sell text-white hover:bg-sell/90"
                : "bg-accent text-white hover:bg-accent/90"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function OpenPaperPositionsPanel({
  trades,
  currentPair,
  currentPrices,
  onSelectPair,
  onClose,
}: {
  trades: PaperTrade[];
  currentPair: string;
  currentPrices: Map<string, number>;
  onSelectPair: (pair: string) => void;
  onClose: (trade: PaperTrade) => void;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-txt-primary">Open Paper Positions</h3>
          <span className="text-[10px] font-mono text-accent">{trades.length}</span>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-txt-dim">No open paper positions</p>
          <p className="text-[10px] text-txt-faint mt-1">Executed paper trades will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-default">
          {trades.map((trade) => {
            const base = trade.pair.split("/")[0];
            const markPrice = currentPrices.get(base) ?? currentPrices.get(trade.pair) ?? trade.entryPrice;
            return (
              <OpenPaperPositionRow
                key={trade.id}
                trade={trade}
                markPrice={markPrice}
                isActivePair={trade.pair === currentPair}
                onSelectPair={onSelectPair}
                onClose={onClose}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

function OpenPaperPositionRow({
  trade,
  markPrice,
  isActivePair,
  onSelectPair,
  onClose,
}: {
  trade: PaperTrade;
  markPrice: number;
  isActivePair: boolean;
  onSelectPair: (pair: string) => void;
  onClose: (trade: PaperTrade) => void;
}) {
  const priceChange = trade.side === "LONG"
    ? markPrice - trade.entryPrice
    : trade.entryPrice - markPrice;
  const pnl = priceChange * trade.quantity;
  const pnlPct = trade.margin > 0 ? (pnl / trade.margin) * 100 : 0;
  const isProfit = pnl >= 0;
  const liqDistance = trade.side === "LONG"
    ? ((markPrice - trade.liquidationPrice) / markPrice) * 100
    : ((trade.liquidationPrice - markPrice) / markPrice) * 100;

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.side === "LONG" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>
              {trade.side}
            </span>
            <button
              onClick={() => onSelectPair(trade.pair)}
              className={`text-sm font-bold truncate cursor-pointer ${isActivePair ? "text-accent" : "text-txt-primary hover:text-accent"}`}
            >
              {trade.pair}
            </button>
            <span className="text-[9px] text-accent font-mono">{trade.leverage}x</span>
          </div>
          <p className="text-[9px] text-txt-faint mt-1">
            Margin {formatUsd(trade.margin)} · Size {trade.quantity.toFixed(5)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold font-mono ${isProfit ? "text-buy" : "text-sell"}`}>
            {isProfit ? "+" : ""}{formatUsd(pnl)}
          </p>
          <p className={`text-[10px] font-mono ${isProfit ? "text-buy" : "text-sell"}`}>
            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
        <span className="text-txt-dim">Entry <span className="text-txt-secondary">${formatPrice(trade.entryPrice)}</span></span>
        <span className="text-txt-dim">Mark <span className="text-txt-secondary">${formatPrice(markPrice)}</span></span>
        <span className="text-txt-dim">TP <span className="text-buy">{trade.takeProfit > 0 ? `$${formatPrice(trade.takeProfit)}` : "-"}</span></span>
        <span className="text-txt-dim">SL <span className="text-sell">{trade.stopLoss > 0 ? `$${formatPrice(trade.stopLoss)}` : "-"}</span></span>
        <span className="text-txt-dim">Liq <span className="text-sell">${formatPrice(trade.liquidationPrice)}</span></span>
        <span className={liqDistance < 5 ? "text-sell" : liqDistance < 15 ? "text-hold" : "text-txt-dim"}>
          Dist {liqDistance.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isActivePair && (
          <button
            onClick={() => onSelectPair(trade.pair)}
            className="flex-1 text-[10px] py-1.5 rounded border border-border-default bg-inset text-txt-secondary hover:border-accent/40 hover:text-accent transition-colors cursor-pointer"
          >
            View Chart
          </button>
        )}
        <button
          onClick={() => onClose(trade)}
          className="flex-1 text-[10px] py-1.5 rounded border border-sell/25 bg-sell/10 text-sell hover:bg-sell/15 transition-colors cursor-pointer font-semibold"
        >
          Close Position
        </button>
      </div>
    </div>
  );
}
