"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TradingChart from "@/components/TradingChart";
import OrderForm from "@/components/OrderForm";
import OrderbookDepth from "@/components/OrderbookDepth";
import OpenOrders from "@/components/OpenOrders";
import RecentTrades from "@/components/RecentTrades";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function TradingPageContent() {
  const d = useDashboard();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState("BTC/USDC");

  // Pre-fill from signal context (URL params from /signals page)
  const signalContext = useMemo(() => {
    const signalId = searchParams.get("signal");
    if (!signalId) return null;
    return d.liveSignals.find((s) => s.id === signalId) ?? null;
  }, [searchParams, d.liveSignals]);

  // Pre-fill pair from signal or URL
  useEffect(() => {
    const urlPair = searchParams.get("pair");
    if (signalContext) {
      setPair(signalContext.pair);
    } else if (urlPair) {
      setPair(urlPair);
    }
  }, [searchParams, signalContext]);

  const coin = pair.split("/")[0];
  const sodexSymbol = pairToSodexSymbol(pair);
  const ticker = sodexSymbol ? d.tickerMap.get(sodexSymbol) : undefined;
  const currentPrice = ticker ? parseFloat(ticker.lastPx) : null;

  const pairs = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Trading</h2>
          <Badge variant="live" size="sm">LIVE</Badge>
        </div>
        <div className="flex items-center gap-3">
          {d.isConnected ? (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
              <span className="text-txt-muted font-mono">{d.shortAddress}</span>
            </div>
          ) : (
            <span className="text-[10px] text-hold">Connect wallet to trade</span>
          )}
        </div>
      </div>

      {/* Wallet balance bar */}
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

        {/* Right: Order Form + Orderbook */}
        <div className="space-y-4">
          <ErrorBoundary name="Order Form">
            <OrderForm
              pair={pair}
              coin={coin}
              currentPrice={currentPrice}
              signal={signalContext}
              isConnected={d.isConnected}
              balance={null}
              onExecute={(order) => {
                d.handleExecuteSignal({
                  id: `manual-${Date.now()}`,
                  pair,
                  action: order.side,
                  confidence: 0,
                  price: parseFloat(order.price) || currentPrice || 0,
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
                    entry: parseFloat(order.price) || currentPrice || 0,
                    takeProfit: parseFloat(order.takeProfit) || 0,
                    stopLoss: parseFloat(order.stopLoss) || 0,
                    positionSize: order.quantity,
                    riskReward: "",
                  },
                  sources: ["Manual"],
                  timeAgo: "just now",
                } as Signal);
              }}
            />
          </ErrorBoundary>

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
