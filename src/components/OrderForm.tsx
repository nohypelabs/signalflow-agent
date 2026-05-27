"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import type { Signal } from "@/lib/types/signal";

interface Props {
  pair: string;
  coin: string;
  currentPrice: number | null;
  signal?: Signal | null;
  isConnected: boolean;
  balance?: { free: string; locked: string } | null;
  paperBalance?: number;
  mode?: "paper" | "live";
  onModeChange?: (mode: "paper" | "live") => void;
  onExecute: (order: {
    side: "BUY" | "SELL";
    quantity: string;
    price: string;
    takeProfit: string;
    stopLoss: string;
  }) => void;
}

function fmtPrice(p: number, coin: string): string {
  if (coin === "BTC") return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

export default function OrderForm({ pair, coin, currentPrice, signal, isConnected, balance, paperBalance, mode = "paper", onModeChange, onExecute }: Props) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");

  // Pre-fill from signal
  useEffect(() => {
    if (signal) {
      setSide(signal.action === "SELL" ? "SELL" : "BUY");
      if (signal.execution.entry > 0) setPrice(signal.execution.entry.toFixed(2));
      if (signal.execution.takeProfit > 0) setTakeProfit(signal.execution.takeProfit.toFixed(2));
      if (signal.execution.stopLoss > 0) setStopLoss(signal.execution.stopLoss.toFixed(2));
    }
  }, [signal]);

  // Update price when currentPrice changes (market mode)
  useEffect(() => {
    if (orderType === "MARKET" && currentPrice) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, orderType]);

  // Calculate totals
  const total = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(price) || 0;
    return q * p;
  }, [quantity, price]);

  const freeBalance = balance ? parseFloat(balance.free) : 0;

  // Quick amount buttons
  const quickAmounts = [0.25, 0.5, 0.75, 1.0];

  // R:R calculation
  const riskReward = useMemo(() => {
    const entry = parseFloat(price) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const sl = parseFloat(stopLoss) || 0;
    if (!entry || !tp || !sl) return null;

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }, [price, takeProfit, stopLoss]);

  const handleSubmit = () => {
    if (!quantity || !price) return;
    onExecute({
      side,
      quantity,
      price: orderType === "MARKET" ? "0" : price,
      takeProfit,
      stopLoss,
    });
  };

  const accentColor = side === "BUY" ? "#00ff88" : "#ff4444";

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-txt-primary">Place Order</h3>
          <div className="flex items-center gap-2">
            {/* Paper/Live toggle */}
            <div className="flex items-center gap-0.5 bg-inset rounded-lg p-0.5">
              <button
                onClick={() => onModeChange?.("paper")}
                className={`text-[9px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  mode === "paper" ? "bg-accent/15 text-accent" : "text-txt-faint hover:text-txt-muted"
                }`}
              >
                📝 Paper
              </button>
              <button
                onClick={() => onModeChange?.("live")}
                className={`text-[9px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  mode === "live" ? "bg-sell/15 text-sell" : "text-txt-faint hover:text-txt-muted"
                }`}
              >
                🔴 Live
              </button>
            </div>
            <span className="text-[9px] text-txt-faint font-mono">{pair}</span>
          </div>
        </div>
        {mode === "paper" && paperBalance != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[8px] text-txt-faint">Paper Balance:</span>
            <span className="text-[10px] font-mono text-accent font-semibold">
              ${paperBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* BUY / SELL toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("BUY")}
            className={`py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              side === "BUY"
                ? "bg-[#00ff88] text-[#0B1020] shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                : "bg-elevated text-txt-muted border border-border-default hover:border-[#00ff88]/30"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              side === "SELL"
                ? "bg-[#ff4444] text-white shadow-[0_0_20px_rgba(255,68,68,0.2)]"
                : "bg-elevated text-txt-muted border border-border-default hover:border-[#ff4444]/30"
            }`}
          >
            SELL
          </button>
        </div>

        {/* Order type */}
        <div className="flex gap-1 bg-inset rounded-lg p-0.5">
          {(["MARKET", "LIMIT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 text-[10px] py-1.5 rounded transition-colors cursor-pointer ${
                orderType === t ? "bg-elevated text-accent" : "text-txt-dim hover:text-txt-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Price input */}
        <div>
          <label className="text-[9px] text-txt-faint uppercase tracking-wider mb-1 block">
            {orderType === "MARKET" ? "Market Price" : "Limit Price"}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-faint">$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={orderType === "MARKET"}
              placeholder="0.00"
              className={`w-full bg-inset border border-border-default rounded-lg pl-6 pr-3 py-2 text-sm font-mono text-txt-primary outline-none focus:border-accent/50 transition-colors ${
                orderType === "MARKET" ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>

        {/* Quantity input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9px] text-txt-faint uppercase tracking-wider">Amount ({coin})</label>
            {freeBalance > 0 && (
              <span className="text-[9px] text-txt-faint">
                Available: <span className="text-txt-secondary font-mono">{freeBalance.toFixed(4)}</span>
              </span>
            )}
          </div>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full bg-inset border border-border-default rounded-lg px-3 py-2 text-sm font-mono text-txt-primary outline-none focus:border-accent/50 transition-colors"
          />
          {/* Quick amount buttons */}
          <div className="flex gap-1.5 mt-2">
            {quickAmounts.map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (freeBalance > 0 && currentPrice) {
                    const maxQty = side === "BUY" ? freeBalance / currentPrice : freeBalance;
                    setQuantity((maxQty * pct).toFixed(6));
                  }
                }}
                className="flex-1 text-[9px] py-1 rounded bg-inset border border-border-default text-txt-muted hover:text-txt-secondary hover:border-border-muted transition-colors cursor-pointer"
              >
                {pct * 100}%
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-txt-faint uppercase tracking-wider mb-1 block">Take Profit</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-faint">$</span>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="—"
                className="w-full bg-inset border border-border-default rounded-lg pl-6 pr-3 py-2 text-xs font-mono text-txt-primary outline-none focus:border-[#00ff88]/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-txt-faint uppercase tracking-wider mb-1 block">Stop Loss</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-faint">$</span>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="—"
                className="w-full bg-inset border border-border-default rounded-lg pl-6 pr-3 py-2 text-xs font-mono text-txt-primary outline-none focus:border-[#ff4444]/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* R:R display */}
        {riskReward && (
          <div className="flex items-center justify-between px-3 py-2 bg-elevated/30 rounded-lg">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider">Risk/Reward</span>
            <span className={`text-sm font-bold font-mono ${
              parseFloat(riskReward) >= 2 ? "text-[#00ff88]" : parseFloat(riskReward) >= 1 ? "text-[#ff8800]" : "text-[#ff4444]"
            }`}>
              {riskReward}:1
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-2 bg-inset rounded-lg">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Total</span>
          <span className="text-sm font-bold font-mono text-txt-primary">
            ${total > 0 ? total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </span>
        </div>

        {/* Signal context */}
        {signal && (
          <div className="px-3 py-2 rounded-lg border border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] text-accent uppercase tracking-wider font-bold">Signal Context</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                signal.action === "BUY" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
              }`}>
                {signal.action} {signal.confidence}%
              </span>
            </div>
            <p className="text-[9px] text-txt-faint leading-relaxed line-clamp-2">
              {signal.reasoning}
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={(mode === "live" && !isConnected) || !quantity || !price}
          className={`w-full py-3 text-sm font-bold rounded-lg transition-all cursor-pointer ${
            (mode === "live" && !isConnected)
              ? "bg-inset text-txt-dim cursor-not-allowed"
              : !quantity || !price
                ? "bg-inset text-txt-dim cursor-not-allowed"
                : side === "BUY"
                  ? "bg-[#00ff88] text-[#0B1020] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] active:scale-[0.98]"
                  : "bg-[#ff4444] text-white hover:shadow-[0_0_30px_rgba(255,68,68,0.3)] active:scale-[0.98]"
          }`}
        >
          {(mode === "live" && !isConnected)
            ? "Connect Wallet"
            : !quantity || !price
              ? "Enter Amount"
              : mode === "paper"
                ? `📝 Paper ${side} ${coin}`
                : `${side} ${coin}`
          }
        </button>
      </div>
    </Card>
  );
}
