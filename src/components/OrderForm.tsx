"use client";

import { useState, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import type { Signal } from "@/lib/types/signal";
import type { TradingType } from "@/lib/types/trading-type";
import { TRADING_TYPES } from "@/lib/types/trading-type";

interface Props {
  pair: string;
  coin: string;
  currentPrice: number | null;
  signal?: Signal | null;
  isConnected: boolean;
  paperBalance?: number;
  mode?: "paper" | "live";
  tradingType?: TradingType | null;
  error?: string | null;
  onModeChange?: (mode: "paper" | "live") => void;
  onExecute: (order: {
    side: "LONG" | "SHORT";
    leverage: number;
    margin: number;
    quantity: number;
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

const LEVERAGE_PRESETS = [1, 2, 3, 5, 10];
const MARGIN_PRESETS = [100, 250, 500, 1000];

export default function OrderForm({ pair, coin, currentPrice, signal, isConnected, paperBalance, mode = "paper", tradingType, error, onModeChange, onExecute }: Props) {
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState(3);
  const [margin, setMargin] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tpPercent, setTpPercent] = useState("");
  const [slPercent, setSlPercent] = useState("");

  // Type-aware leverage limits
  const typeConfig = tradingType ? TRADING_TYPES[tradingType] : null;
  const maxLeverage = typeConfig ? typeConfig.maxLeverage : 100;
  const leveragePresets = useMemo(() => {
    if (!typeConfig) return LEVERAGE_PRESETS;
    const max = typeConfig.maxLeverage;
    return LEVERAGE_PRESETS.filter((l) => l <= max);
  }, [typeConfig]);

  // Cap leverage when type changes
  useEffect(() => {
    if (typeConfig && leverage > typeConfig.maxLeverage) {
      setLeverage(typeConfig.defaultLeverage);
    }
  }, [typeConfig, leverage]);

  // Pre-fill from signal
  useEffect(() => {
    if (signal) {
      const isLong = signal.action === "LONG" || signal.actionV2 === "STRONG_LONG" || signal.actionV2 === "LONG" || signal.actionV2 === "WEAK_LONG";
      setSide(isLong ? "LONG" : "SHORT");
      if (signal.execution.takeProfit > 0) setTakeProfit(signal.execution.takeProfit.toFixed(2));
      if (signal.execution.stopLoss > 0) setStopLoss(signal.execution.stopLoss.toFixed(2));
      // Calculate TP/SL percentages
      if (signal.execution.entry > 0 && signal.execution.takeProfit > 0) {
        const tpPct = Math.abs((signal.execution.takeProfit - signal.execution.entry) / signal.execution.entry * 100);
        setTpPercent(tpPct.toFixed(1));
      }
      if (signal.execution.entry > 0 && signal.execution.stopLoss > 0) {
        const slPct = Math.abs((signal.execution.stopLoss - signal.execution.entry) / signal.execution.entry * 100);
        setSlPercent(slPct.toFixed(1));
      }
    }
  }, [signal]);

  // Auto-calculate TP/SL from percentage
  useEffect(() => {
    if (currentPrice && tpPercent) {
      const pct = parseFloat(tpPercent) / 100;
      const tp = side === "LONG"
        ? currentPrice * (1 + pct)
        : currentPrice * (1 - pct);
      setTakeProfit(tp.toFixed(2));
    }
  }, [currentPrice, tpPercent, side]);

  useEffect(() => {
    if (currentPrice && slPercent) {
      const pct = parseFloat(slPercent) / 100;
      const sl = side === "LONG"
        ? currentPrice * (1 - pct)
        : currentPrice * (1 + pct);
      setStopLoss(sl.toFixed(2));
    }
  }, [currentPrice, slPercent, side]);

  // Calculated values
  const marginNum = parseFloat(margin) || 0;
  const notional = marginNum * leverage;
  const quantity = currentPrice ? notional / currentPrice : 0;
  const liqPrice = useMemo(() => {
    if (!currentPrice || marginNum === 0) return 0;
    const mm = 0.005; // maintenance margin
    if (side === "LONG") return currentPrice * (1 - (1 / leverage) + mm);
    return currentPrice * (1 + (1 / leverage) - mm);
  }, [currentPrice, side, leverage, marginNum]);

  // R:R
  const riskReward = useMemo(() => {
    const entry = currentPrice || 0;
    const tp = parseFloat(takeProfit) || 0;
    const sl = parseFloat(stopLoss) || 0;
    if (!entry || !tp || !sl) return null;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }, [currentPrice, takeProfit, stopLoss]);

  const validationError = useMemo(() => {
    const entry = currentPrice ?? 0;
    const tp = parseFloat(takeProfit) || 0;
    const sl = parseFloat(stopLoss) || 0;

    if (!entry) return "Market price is not available.";
    if (!marginNum) return null;
    if (marginNum <= 0) return "Margin must be greater than 0.";
    if (mode === "paper" && paperBalance != null && marginNum > paperBalance) return "Margin exceeds available paper balance.";

    if (tp > 0) {
      if (side === "LONG" && tp <= entry) return "LONG take profit must be above entry price.";
      if (side === "SHORT" && tp >= entry) return "SHORT take profit must be below entry price.";
    }

    if (sl > 0) {
      if (side === "LONG" && sl >= entry) return "LONG stop loss must be below entry price.";
      if (side === "SHORT" && sl <= entry) return "SHORT stop loss must be above entry price.";
      if (liqPrice > 0 && side === "LONG" && sl <= liqPrice) return "LONG stop loss must sit above liquidation price.";
      if (liqPrice > 0 && side === "SHORT" && sl >= liqPrice) return "SHORT stop loss must sit below liquidation price.";
    }

    return null;
  }, [currentPrice, takeProfit, stopLoss, marginNum, mode, paperBalance, side, liqPrice]);

  const handleSubmit = () => {
    if (!marginNum || !currentPrice || validationError) return;
    onExecute({
      side,
      leverage,
      margin: marginNum,
      quantity,
      takeProfit,
      stopLoss,
    });
  };

  const isSubmitDisabled = (mode === "live" && !isConnected) || !marginNum || !currentPrice || Boolean(validationError);
  const displayedError = error ?? (marginNum > 0 ? validationError : null);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-txt-primary">Open Position</h3>
          <div className="flex items-center gap-2">
            {typeConfig && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: `${typeConfig.color}15`,
                  color: typeConfig.color,
                  border: `1px solid ${typeConfig.color}30`,
                }}
              >
                {typeConfig.icon} {typeConfig.label}
              </span>
            )}
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
            <span className="text-[8px] text-txt-faint">Available:</span>
            <span className="text-[10px] font-mono text-accent font-semibold">
              ${paperBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* LONG / SHORT toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("LONG")}
            className={`py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              side === "LONG"
                ? "bg-[#00ff88] text-[#0B1020] shadow-[0_0_20px_rgba(0,255,136,0.2)]"
                : "bg-elevated text-txt-muted border border-border-default hover:border-[#00ff88]/30"
            }`}
          >
            ▲ LONG
          </button>
          <button
            onClick={() => setSide("SHORT")}
            className={`py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              side === "SHORT"
                ? "bg-[#ff4444] text-white shadow-[0_0_20px_rgba(255,68,68,0.2)]"
                : "bg-elevated text-txt-muted border border-border-default hover:border-[#ff4444]/30"
            }`}
          >
            ▼ SHORT
          </button>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[9px] text-txt-faint uppercase tracking-wider">Leverage</label>
            <span className="text-sm font-bold font-mono text-accent">{leverage}x</span>
          </div>
          <input
            type="range"
            min={1}
            max={maxLeverage}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 bg-elevated rounded-full appearance-none cursor-pointer accent-accent"
          />
          <div className="flex gap-1.5 mt-2">
            {leveragePresets.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 text-[9px] py-1 rounded transition-colors cursor-pointer ${
                  leverage === lev
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-inset text-txt-muted border border-border-default hover:border-border-muted"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Margin */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9px] text-txt-faint uppercase tracking-wider">Margin (USDC)</label>
            {paperBalance && paperBalance > 0 && (
              <button
                onClick={() => setMargin(paperBalance.toFixed(2))}
                className="text-[9px] text-accent hover:underline cursor-pointer"
              >
                Max: ${paperBalance.toFixed(0)}
              </button>
            )}
          </div>
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            placeholder="0.00"
            className="w-full bg-inset border border-border-default rounded-lg px-3 py-2 text-sm font-mono text-txt-primary outline-none focus:border-accent/50 transition-colors"
          />
          <div className="flex gap-1.5 mt-2">
            {MARGIN_PRESETS.filter((m) => !paperBalance || m <= paperBalance).map((m) => (
              <button
                key={m}
                onClick={() => setMargin(m.toString())}
                className="flex-1 text-[9px] py-1 rounded bg-inset border border-border-default text-txt-muted hover:text-txt-secondary hover:border-border-muted transition-colors cursor-pointer"
              >
                ${m}
              </button>
            ))}
          </div>
        </div>

        {/* Position summary */}
        {marginNum > 0 && currentPrice && (
          <div className="grid grid-cols-3 gap-2 bg-elevated/20 rounded-lg p-2.5">
            <div className="text-center">
              <p className="text-[8px] text-txt-faint uppercase">Notional</p>
              <p className="text-xs font-bold font-mono text-txt-primary">${notional.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-txt-faint uppercase">Size</p>
              <p className="text-xs font-mono text-txt-secondary">{quantity.toFixed(6)} {coin}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] text-txt-faint uppercase">Liq. Price</p>
              <p className={`text-xs font-mono font-bold ${liqPrice > 0 ? "text-[#ff4444]" : "text-txt-faint"}`}>
                ${fmtPrice(liqPrice, coin)}
              </p>
            </div>
          </div>
        )}

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-txt-faint uppercase tracking-wider mb-1 block">
              Take Profit {tpPercent && <span className="text-[#00ff88]">({tpPercent}%)</span>}
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => { setTakeProfit(e.target.value); setTpPercent(""); }}
                placeholder="Price"
                className="flex-1 bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-[#00ff88]/50"
              />
              <input
                type="number"
                value={tpPercent}
                onChange={(e) => setTpPercent(e.target.value)}
                placeholder="%"
                className="w-14 bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-[#00ff88]/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-txt-faint uppercase tracking-wider mb-1 block">
              Stop Loss {slPercent && <span className="text-[#ff4444]">({slPercent}%)</span>}
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => { setStopLoss(e.target.value); setSlPercent(""); }}
                placeholder="Price"
                className="flex-1 bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-[#ff4444]/50"
              />
              <input
                type="number"
                value={slPercent}
                onChange={(e) => setSlPercent(e.target.value)}
                placeholder="%"
                className="w-14 bg-inset border border-border-default rounded-lg px-2 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-[#ff4444]/50"
              />
            </div>
          </div>
        </div>

        {/* R:R */}
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

        {displayedError && (
          <div className="px-3 py-2 rounded-lg border border-[#ff4444]/20 bg-[#ff4444]/5 text-[10px] text-[#ff7777] leading-relaxed">
            {displayedError}
          </div>
        )}

        {/* Signal context */}
        {signal && (
          <div className="px-3 py-2 rounded-lg border border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] text-accent uppercase tracking-wider font-bold">Signal</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                side === "LONG" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
              }`}>
                {signal.actionV2 ?? signal.action} {signal.confidence}%
              </span>
              {signal.regime && (
                <span className="text-[8px] text-txt-faint font-mono">{signal.regime.replace("_", " ")}</span>
              )}
            </div>
            <p className="text-[9px] text-txt-faint leading-relaxed line-clamp-2">{signal.reasoning}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`w-full py-3 text-sm font-bold rounded-lg transition-all cursor-pointer ${
            (mode === "live" && !isConnected)
              ? "bg-inset text-txt-dim cursor-not-allowed"
              : !marginNum || !currentPrice || validationError
                ? "bg-inset text-txt-dim cursor-not-allowed"
                : side === "LONG"
                  ? "bg-[#00ff88] text-[#0B1020] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] active:scale-[0.98]"
                  : "bg-[#ff4444] text-white hover:shadow-[0_0_30px_rgba(255,68,68,0.3)] active:scale-[0.98]"
          }`}
        >
          {(mode === "live" && !isConnected)
            ? "Connect Wallet"
            : !marginNum || !currentPrice
              ? "Enter Margin"
              : validationError
                ? "Fix Order"
              : mode === "paper"
                ? `📝 Paper ${side} ${leverage}x · $${marginNum}`
                : `${side} ${leverage}x`
          }
        </button>
      </div>
    </Card>
  );
}
