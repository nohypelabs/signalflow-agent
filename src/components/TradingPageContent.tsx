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

export default function TradingPageContent() {
  const d = useDashboard();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState("BTC/USDC");
  const [tradeMode, setTradeMode] = useState<"paper" | "live">("paper");
  const paper = usePaperTrading();

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

  // Check TP/SL for paper trades every tick
  useEffect(() => {
    if (!currentPrice) return;
    const base = pair.split("/")[0];
    const prices = new Map<string, number>();
    prices.set(base, currentPrice);
    prices.set(pair, currentPrice);
    // Also add other pairs from tickers
    for (const t of d.tickers ?? []) {
      const sym = t.symbol.replace("v", "").replace("_", "/");
      prices.set(sym.split("/")[0], parseFloat(t.lastPx));
    }
    paper.checkTpSl(prices);
  }, [currentPrice, d.tickers]);

  const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"];

  const handleExecute = (order: { side: "LONG" | "SHORT"; leverage: number; margin: number; quantity: number; takeProfit: string; stopLoss: string }) => {
    const entryPrice = currentPrice || 0;
    const tp = parseFloat(order.takeProfit) || 0;
    const sl = parseFloat(order.stopLoss) || 0;

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
        alert("Insufficient paper balance");
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
              onModeChange={setTradeMode}
              onExecute={handleExecute}
            />
          </ErrorBoundary>

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
