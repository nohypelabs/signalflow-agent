"use client";

import { useState, useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { Signal } from "@/lib/types/signal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import OpenOrders from "@/components/OpenOrders";
import SignalTypeBadge from "@/components/signals/SignalTypeBadge";
import ConfidenceBadge from "@/components/signals/ConfidenceBadge";
import SignalScoreBreakdown from "@/components/signals/SignalScoreBreakdown";
import { formatPrice, formatPercent } from "@/components/signals/signal-utils";

/* ── Helpers ── */

function fmtBalance(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "0";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

/* ── Component ── */

export default function TradingPage() {
  const d = useDashboard();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [pairFilter, setPairFilter] = useState<string>("ALL");

  // Selected signal's ticker
  const selectedCoin = selectedSignal?.pair.split("/")[0] ?? "";
  const selectedSodSym = selectedSignal ? pairToSodexSymbol(selectedSignal.pair) : "";
  const selectedTicker = selectedSodSym ? d.tickerMap.get(selectedSodSym) : undefined;
  const selectedDims = selectedSignal ? d.signalsData?.dimensions?.[selectedCoin] ?? null : null;
  const selectedOverall = selectedSignal ? d.signalsData?.overall?.[selectedCoin] ?? null : null;

  // Filter signals
  const filteredSignals = useMemo(() => {
    if (pairFilter === "ALL") return d.liveSignals;
    return d.liveSignals.filter((s) => s.pair.startsWith(pairFilter));
  }, [d.liveSignals, pairFilter]);

  // Unique pairs for filter
  const pairs = useMemo(() => {
    const set = new Set(d.liveSignals.map((s) => s.pair.split("/")[0]));
    return ["ALL", ...Array.from(set)];
  }, [d.liveSignals]);

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

      {/* Main layout: signals + execution panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Signal list */}
        <div className="xl:col-span-2 space-y-3">
          {/* Pair filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-txt-dim uppercase tracking-wider">Pair:</span>
            <div className="flex items-center gap-0.5 bg-inset border border-border-default rounded-lg p-0.5">
              {pairs.map((p) => (
                <button
                  key={p}
                  onClick={() => setPairFilter(p)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    pairFilter === p ? "bg-elevated text-accent" : "text-txt-dim hover:text-txt-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-txt-faint ml-auto">{filteredSignals.length} signals</span>
          </div>

          {/* Signal cards */}
          {filteredSignals.length === 0 ? (
            <EmptyState
              title="No signals available"
              description="Signals are generated from live SoDEX and SoSoValue data. Wait for the next refresh."
              icon="signal"
            />
          ) : (
            <div className="space-y-2">
              {filteredSignals.map((s) => {
                const sodSym = pairToSodexSymbol(s.pair);
                const ticker = d.tickerMap.get(sodSym);
                const price = ticker ? parseFloat(ticker.lastPx) : s.price;
                const change = ticker ? ticker.changePct : s.change24h;
                const coin = s.pair.split("/")[0];
                const hasOpenOrder = d.openOrders.some((o) => o.symbol === sodSym);
                const isSelected = selectedSignal?.id === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSignal(isSelected ? null : s)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      ${isSelected
                        ? "border-accent bg-accent/5 shadow-sm shadow-accent/10"
                        : "border-border-default bg-card hover:border-border-muted hover:bg-elevated/30"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: pair + signal info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold text-txt-primary">{s.pair}</span>
                        <SignalTypeBadge action={s.action} size="sm" />
                        {ticker && <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />}
                        <ConfidenceBadge value={s.confidence} size="sm" />
                      </div>

                      {/* Center: price + change */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono text-txt-primary">
                          ${formatPrice(price, coin)}
                        </span>
                        <span className={`text-xs font-mono font-semibold ${change >= 0 ? "text-buy" : "text-sell"}`}>
                          {formatPercent(change)}
                        </span>
                      </div>

                      {/* Right: execute button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          d.handleExecuteSignal(s);
                        }}
                        disabled={!d.isConnected || hasOpenOrder}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          !d.isConnected || hasOpenOrder
                            ? "bg-inset text-txt-dim cursor-not-allowed"
                            : s.action === "BUY"
                              ? "bg-buy/15 text-buy border border-buy/20 hover:bg-buy/25"
                              : s.action === "SELL"
                                ? "bg-sell/15 text-sell border border-sell/20 hover:bg-sell/25"
                                : "bg-hold/15 text-hold border border-hold/20 hover:bg-hold/25"
                        }`}
                      >
                        {!d.isConnected ? "Connect" : hasOpenOrder ? "Order Open" : s.action === "HOLD" ? "N/A" : `${s.action}`}
                      </button>
                    </div>

                    {/* Thesis preview (when selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-border-default animate-slide-up">
                        <p className="text-xs text-txt-secondary leading-relaxed mb-3">{s.reasoning}</p>

                        {/* TP/SL bar */}
                        {s.execution && s.execution.entry > 0 && (
                          <div className="flex items-center gap-4 text-[10px] font-mono mb-3">
                            <span>Entry <span className="text-accent">${formatPrice(s.execution.entry, coin)}</span></span>
                            <span>TP <span className="text-buy">${formatPrice(s.execution.takeProfit, coin)}</span></span>
                            <span>SL <span className="text-sell">${formatPrice(s.execution.stopLoss, coin)}</span></span>
                            <span>R:R <span className="text-txt-secondary">{s.execution.riskReward}</span></span>
                          </div>
                        )}

                        {/* Dimension mini bars */}
                        <SignalScoreBreakdown
                          dims={s.dimensions}
                          dimDetails={s.dimensionDetails}
                          compact
                        />

                        {/* Sources */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.sources.map((src) => (
                            <span key={src} className="text-[8px] text-txt-faint bg-inset px-1.5 py-0.5 rounded">{src}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Execution panel */}
        <div className="space-y-3">
          {/* Selected signal detail */}
          {selectedSignal ? (
            <Card padding="lg" accent={selectedSignal.action === "BUY" ? "#00ff88" : selectedSignal.action === "SELL" ? "#ff4444" : "#ff8800"}>
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Signal Detail</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-bold text-txt-primary">{selectedSignal.pair}</span>
                <SignalTypeBadge action={selectedSignal.action} size="md" />
              </div>

              {/* Live price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xl font-bold font-mono text-txt-primary">
                  ${formatPrice(
                    selectedTicker ? parseFloat(selectedTicker.lastPx) : selectedSignal.price,
                    selectedCoin
                  )}
                </span>
                {selectedTicker && (
                  <span className={`text-sm font-mono font-semibold ${selectedTicker.changePct >= 0 ? "text-buy" : "text-sell"}`}>
                    {formatPercent(selectedTicker.changePct)}
                  </span>
                )}
              </div>

              {/* Confidence */}
              <div className="mb-4">
                <ConfidenceBadge value={selectedSignal.confidence} size="lg" showLabel />
                {selectedOverall != null && (
                  <span className="text-[10px] text-txt-dim ml-2">Overall: {selectedOverall}/100</span>
                )}
              </div>

              {/* Execution plan */}
              {selectedSignal.execution && selectedSignal.execution.entry > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] text-txt-muted uppercase tracking-wider">Trade Plan</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Entry", value: `$${formatPrice(selectedSignal.execution.entry, selectedCoin)}`, color: "text-accent" },
                      { label: "Take Profit", value: selectedSignal.execution.takeProfit > 0 ? `$${formatPrice(selectedSignal.execution.takeProfit, selectedCoin)}` : "—", color: "text-buy" },
                      { label: "Stop Loss", value: selectedSignal.execution.stopLoss > 0 ? `$${formatPrice(selectedSignal.execution.stopLoss, selectedCoin)}` : "—", color: "text-sell" },
                      { label: "R:R", value: selectedSignal.execution.riskReward || "—", color: "text-txt-primary" },
                    ].map((item) => (
                      <div key={item.label} className="bg-inset rounded-lg p-2 border border-border-default">
                        <p className="text-[9px] text-txt-dim">{item.label}</p>
                        <p className={`text-xs font-bold font-mono ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execute button */}
              <button
                onClick={() => d.handleExecuteSignal(selectedSignal)}
                disabled={!d.isConnected || selectedSignal.action === "HOLD" || d.openOrders.some((o) => o.symbol === selectedSodSym)}
                className={`w-full py-2.5 text-sm font-bold rounded-lg transition-colors ${
                  !d.isConnected
                    ? "bg-inset text-txt-dim cursor-not-allowed"
                    : selectedSignal.action === "HOLD"
                      ? "bg-inset text-txt-dim cursor-not-allowed"
                      : d.openOrders.some((o) => o.symbol === selectedSodSym)
                        ? "bg-inset text-txt-dim cursor-not-allowed"
                        : selectedSignal.action === "BUY"
                          ? "bg-buy text-white hover:bg-buy/80"
                          : "bg-sell text-white hover:bg-sell/80"
                }`}
              >
                {!d.isConnected
                  ? "Connect Wallet"
                  : selectedSignal.action === "HOLD"
                    ? "No Action (HOLD)"
                    : d.openOrders.some((o) => o.symbol === selectedSodSym)
                      ? "Order Already Open"
                      : `Execute ${selectedSignal.action} on SoDEX`}
              </button>
            </Card>
          ) : (
            <Card padding="lg">
              <EmptyState
                title="Select a signal"
                description="Click a signal on the left to view details and execute trades."
                icon="signal"
              />
            </Card>
          )}

          {/* Open orders */}
          <OpenOrders
            orders={d.orders}
            loading={d.ordersLoading}
            error={d.ordersError}
            onCancel={d.cancelOrder}
          />
        </div>
      </div>
    </div>
  );
}
