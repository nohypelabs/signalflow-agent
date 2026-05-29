"use client";

import { useState, useMemo, useEffect } from "react";
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

export default function OrderForm({ pair, coin, currentPrice, signal, isConnected, paperBalance, mode = "paper", tradingType, error, onExecute }: Props) {
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(3);
  const [showLeverageSettings, setShowLeverageSettings] = useState(false);
  const [margin, setMargin] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tpPercent, setTpPercent] = useState("");
  const [slPercent, setSlPercent] = useState("");
  const [showTpSl, setShowTpSl] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [sliderPct, setSliderPct] = useState(0);
  const [marginMode, setMarginMode] = useState<"Isolated" | "Cross">("Isolated");
  const [showMarginDropdown, setShowMarginDropdown] = useState(false);

  // Type-aware leverage limits
  const typeConfig = tradingType ? TRADING_TYPES[tradingType] : null;

  // Pair-based max leverage: BTC/ETH/SOL = 20x, others = 5x
  const pairMaxLeverage = useMemo(() => {
    const base = pair.split("/")[0].toUpperCase();
    return ["BTC", "ETH", "SOL"].includes(base) ? 20 : 5;
  }, [pair]);

  const maxLeverage = typeConfig ? Math.min(typeConfig.maxLeverage, pairMaxLeverage) : pairMaxLeverage;
  const leveragePresets = useMemo(() => {
    return LEVERAGE_PRESETS.filter((l) => l <= maxLeverage);
  }, [maxLeverage]);

  useEffect(() => {
    if (leverage > maxLeverage) setLeverage(maxLeverage);
  }, [maxLeverage, leverage]);

  // Pre-fill from signal
  useEffect(() => {
    if (signal) {
      const isLong = signal.action === "LONG" || signal.actionV2 === "STRONG_LONG" || signal.actionV2 === "LONG" || signal.actionV2 === "WEAK_LONG";
      setSide(isLong ? "LONG" : "SHORT");
      if (signal.execution.takeProfit > 0) setTakeProfit(signal.execution.takeProfit.toFixed(2));
      if (signal.execution.stopLoss > 0) setStopLoss(signal.execution.stopLoss.toFixed(2));
      if (signal.execution.entry > 0 && signal.execution.takeProfit > 0) {
        setTpPercent(Math.abs((signal.execution.takeProfit - signal.execution.entry) / signal.execution.entry * 100).toFixed(1));
      }
      if (signal.execution.entry > 0 && signal.execution.stopLoss > 0) {
        setSlPercent(Math.abs((signal.execution.stopLoss - signal.execution.entry) / signal.execution.entry * 100).toFixed(1));
      }
    }
  }, [signal]);

  // Auto-calculate TP/SL from percentage
  useEffect(() => {
    if (currentPrice && tpPercent) {
      const pct = parseFloat(tpPercent) / 100;
      const tp = side === "LONG" ? currentPrice * (1 + pct) : currentPrice * (1 - pct);
      setTakeProfit(tp.toFixed(2));
    }
  }, [currentPrice, tpPercent, side]);

  useEffect(() => {
    if (currentPrice && slPercent) {
      const pct = parseFloat(slPercent) / 100;
      const sl = side === "LONG" ? currentPrice * (1 - pct) : currentPrice * (1 + pct);
      setStopLoss(sl.toFixed(2));
    }
  }, [currentPrice, slPercent, side]);

  // Calculated values
  const marginNum = parseFloat(margin) || 0;
  const notional = marginNum * leverage;
  const quantity = currentPrice ? notional / currentPrice : 0;
  const liqPrice = useMemo(() => {
    if (!currentPrice || marginNum === 0) return 0;
    const mm = 0.005;
    return side === "LONG" ? currentPrice * (1 - 1 / leverage + mm) : currentPrice * (1 + 1 / leverage - mm);
  }, [currentPrice, side, leverage, marginNum]);

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

  // Slider → margin sync
  useEffect(() => {
    if (sliderPct > 0 && paperBalance && paperBalance > 0) {
      setMargin(((sliderPct / 100) * paperBalance).toFixed(2));
    }
  }, [sliderPct, paperBalance]);

  const handleSubmit = () => {
    if (!marginNum || !currentPrice || validationError) return;
    onExecute({ side, leverage, margin: marginNum, quantity, takeProfit, stopLoss });
  };

  const isSubmitDisabled = (mode === "live" && !isConnected) || !marginNum || !currentPrice || Boolean(validationError);
  const displayedError = error ?? (marginNum > 0 ? validationError : null);

  return (
    <div className="flex flex-col">
      {/* ═══ [1] Long / Short Tabs ═══ */}
      <div className="flex border-b border-border-default">
        <button onClick={() => setSide("LONG")} className={`flex-1 py-2.5 text-sm font-bold cursor-pointer transition-all border-b-2 ${
          side === "LONG" ? "text-buy border-buy bg-buy/5" : "text-txt-dim border-transparent hover:text-txt-secondary"
        }`}>Long</button>
        <button onClick={() => setSide("SHORT")} className={`flex-1 py-2.5 text-sm font-bold cursor-pointer transition-all border-b-2 ${
          side === "SHORT" ? "text-sell border-sell bg-sell/5" : "text-txt-dim border-transparent hover:text-txt-secondary"
        }`}>Short</button>
      </div>

      <div className="p-3 space-y-3">
        {/* ═══ [2] Order Type Selector ═══ */}
        <div className="flex items-center gap-0.5 bg-inset rounded-lg p-0.5 border border-border-default">
          <button onClick={() => setOrderType("Market")} className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
            orderType === "Market" ? "bg-elevated text-accent border border-accent/20" : "text-txt-dim hover:text-txt-muted border border-transparent"
          }`}>Market</button>
          <button onClick={() => setOrderType("Limit")} className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
            orderType === "Limit" ? "bg-elevated text-accent border border-accent/20" : "text-txt-dim hover:text-txt-muted border border-transparent"
          }`}>Limit</button>
        </div>

        {/* Limit price input (conditional) */}
        {orderType === "Limit" && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider shrink-0">Price</span>
            <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={currentPrice ? fmtPrice(currentPrice, coin) : "0.00"}
              className="flex-1 bg-inset border border-border-default rounded-lg px-2.5 py-1.5 text-xs font-mono text-txt-primary outline-none focus:border-accent/50" />
          </div>
        )}

        {/* ═══ [3] Leverage + Margin Mode Row ═══ */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[9px] text-txt-faint uppercase tracking-wider">Leverage</span>
            <button onClick={() => setShowLeverageSettings(!showLeverageSettings)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-inset border border-border-default cursor-pointer hover:border-border-muted transition-colors">
              <span className="text-xs font-bold font-mono text-accent">{leverage}x</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-dim"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
          <div className="relative">
            <button onClick={() => setShowMarginDropdown(!showMarginDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-inset border border-border-default cursor-pointer hover:border-border-muted hover:bg-elevated/20 transition-all">
              <span className="text-[11px] text-txt-secondary font-medium">{marginMode}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-dim"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showMarginDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-30 bg-card border border-border-muted rounded-xl overflow-hidden min-w-[140px]">
                <div className="px-3 py-2 border-b border-border-default bg-inset/30">
                  <span className="text-[9px] text-txt-muted font-medium uppercase tracking-wider">Margin Mode</span>
                </div>
                {(["Isolated", "Cross"] as const).map((mode) => (
                  <button key={mode} onClick={() => { setMarginMode(mode); setShowMarginDropdown(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-[12px] font-medium cursor-pointer transition-colors ${
                      marginMode === mode ? "bg-accent/8 text-accent" : "text-txt-secondary hover:bg-elevated/30 hover:text-txt-primary"
                    }`}>
                    {marginMode === mode && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    <span>{mode}</span>
                    <span className="text-[9px] text-txt-faint ml-auto">{mode === "Isolated" ? "Safer" : "Flexible"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leverage settings (expandable) */}
        {showLeverageSettings && (
          <div className="space-y-2.5 p-3 rounded-xl bg-inset/50 border border-border-default">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-txt-dim uppercase tracking-wider">Leverage</span>
              <span className="text-sm font-bold font-mono text-accent tabular-nums">{leverage}x</span>
            </div>
            <input type="range" min={1} max={maxLeverage} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-1.5 bg-elevated rounded-full appearance-none cursor-pointer accent-accent" />
            <div className="flex gap-1.5">
              {leveragePresets.map((lev) => (
                <button key={lev} onClick={() => setLeverage(lev)} className={`flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer transition-all font-medium ${
                  leverage === lev ? "bg-accent/15 text-accent border border-accent/30" : "bg-inset text-txt-dim border border-border-default hover:border-border-muted hover:text-txt-secondary"
                }`}>{lev}x</button>
              ))}
            </div>
            <div className="flex items-center justify-between text-[9px] text-txt-faint">
              <span>Max: {maxLeverage}x</span>
              <span>Notional: ${((parseFloat(margin) || 0) * leverage).toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* ═══ [4] Available Balance ═══ */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-txt-faint uppercase tracking-wider">Available to Trade</span>
          <span className="text-xs font-mono text-txt-secondary tabular-nums">
            {paperBalance != null ? `$${paperBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} USDC
          </span>
        </div>

        {/* ═══ [5] Amount / Margin Input ═══ */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-txt-faint uppercase tracking-wider">Amount</span>
              {paperBalance && paperBalance > 0 && (
                <button onClick={() => { setMargin(paperBalance.toFixed(2)); setSliderPct(100); }}
                  className="text-[8px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-bold cursor-pointer hover:bg-accent/15 transition-colors">MAX</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-inset border border-border-default rounded-lg px-2.5 py-2 focus-within:border-accent/50 transition-colors">
            <input type="number" value={margin} onChange={(e) => { setMargin(e.target.value); setSliderPct(0); }} placeholder="0.00"
              className="flex-1 bg-transparent text-sm font-mono text-txt-primary outline-none placeholder:text-txt-faint" />
            <span className="text-[10px] text-txt-muted font-semibold shrink-0">USDC</span>
          </div>
          {/* Quick amounts */}
          <div className="flex gap-1.5 mt-2">
            {MARGIN_PRESETS.filter((m) => !paperBalance || m <= paperBalance).map((m) => (
              <button key={m} onClick={() => { setMargin(m.toString()); setSliderPct(paperBalance ? (m / paperBalance) * 100 : 0); }}
                className="flex-1 text-[9px] py-1 rounded border border-border-default text-txt-dim hover:text-txt-secondary hover:border-border-muted transition-colors cursor-pointer">
                ${m}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ [6] Percentage Slider ═══ */}
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} step={5} value={sliderPct} onChange={(e) => setSliderPct(Number(e.target.value))}
            className="flex-1 h-1 bg-elevated rounded-full appearance-none cursor-pointer accent-accent" />
          <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md min-w-[40px] text-center tabular-nums">{sliderPct}%</span>
        </div>

        {/* Position summary (when margin entered) */}
        {marginNum > 0 && currentPrice && (
          <div className="grid grid-cols-3 gap-1.5 bg-elevated/20 rounded-lg p-2">
            <div className="text-center"><p className="text-[7px] text-txt-faint uppercase">Notional</p><p className="text-[10px] font-bold font-mono text-txt-primary tabular-nums">${notional.toFixed(0)}</p></div>
            <div className="text-center"><p className="text-[7px] text-txt-faint uppercase">Size</p><p className="text-[10px] font-mono text-txt-secondary tabular-nums">{quantity.toFixed(6)} {coin}</p></div>
            <div className="text-center"><p className="text-[7px] text-txt-faint uppercase">Liq. Price</p><p className={`text-[10px] font-mono font-bold tabular-nums ${liqPrice > 0 ? "text-sell" : "text-txt-faint"}`}>{liqPrice > 0 ? `$${fmtPrice(liqPrice, coin)}` : "—"}</p></div>
          </div>
        )}

        {/* ═══ [7] Checkboxes ═══ */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded border border-border-default bg-inset accent-accent cursor-pointer" />
            <span className="text-[10px] text-txt-secondary group-hover:text-txt-primary transition-colors">Reduce Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={showTpSl} onChange={(e) => setShowTpSl(e.target.checked)}
              className="w-3.5 h-3.5 rounded border border-border-default bg-inset accent-accent cursor-pointer" />
            <span className="text-[10px] text-txt-secondary group-hover:text-txt-primary transition-colors">Take Profit / Stop Loss</span>
          </label>
        </div>

        {/* TP/SL fields (collapsible) */}
        {showTpSl && (
          <div className="space-y-3">
            {/* Take Profit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[8px] text-txt-faint uppercase tracking-wider">
                  Take Profit {tpPercent && <span className="text-buy">({tpPercent}%)</span>}
                </label>
                {currentPrice && takeProfit && (
                  <span className="text-[9px] font-mono text-buy/70 tabular-nums">
                    ${fmtPrice(parseFloat(takeProfit), coin)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <input type="number" value={takeProfit} onChange={(e) => { setTakeProfit(e.target.value); setTpPercent(""); }} placeholder="Price"
                  className="flex-1 bg-inset border border-border-default rounded px-2 py-1.5 text-[10px] font-mono text-txt-primary outline-none focus:border-buy/50" />
                <input type="number" value={tpPercent} onChange={(e) => setTpPercent(e.target.value)} placeholder="%"
                  className="w-12 bg-inset border border-border-default rounded px-1.5 py-1.5 text-[10px] font-mono text-txt-primary outline-none focus:border-buy/50" />
              </div>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 5, 10, 25].map((pct) => (
                  <button key={pct} onClick={() => setTpPercent(pct.toString())}
                    className={`flex-1 text-[8px] py-1 rounded border cursor-pointer transition-colors ${
                      tpPercent === pct.toString()
                        ? "bg-buy/15 text-buy border-buy/30"
                        : "border-border-default text-txt-dim hover:text-buy hover:border-buy/20"
                    }`}>{pct}%</button>
                ))}
              </div>
            </div>

            {/* Stop Loss */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[8px] text-txt-faint uppercase tracking-wider">
                  Stop Loss {slPercent && <span className="text-sell">({slPercent}%)</span>}
                </label>
                {currentPrice && stopLoss && (
                  <span className="text-[9px] font-mono text-sell/70 tabular-nums">
                    ${fmtPrice(parseFloat(stopLoss), coin)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <input type="number" value={stopLoss} onChange={(e) => { setStopLoss(e.target.value); setSlPercent(""); }} placeholder="Price"
                  className="flex-1 bg-inset border border-border-default rounded px-2 py-1.5 text-[10px] font-mono text-txt-primary outline-none focus:border-sell/50" />
                <input type="number" value={slPercent} onChange={(e) => setSlPercent(e.target.value)} placeholder="%"
                  className="w-12 bg-inset border border-border-default rounded px-1.5 py-1.5 text-[10px] font-mono text-txt-primary outline-none focus:border-sell/50" />
              </div>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 5, 10, 25].map((pct) => (
                  <button key={pct} onClick={() => setSlPercent(pct.toString())}
                    className={`flex-1 text-[8px] py-1 rounded border cursor-pointer transition-colors ${
                      slPercent === pct.toString()
                        ? "bg-sell/15 text-sell border-sell/30"
                        : "border-border-default text-txt-dim hover:text-sell hover:border-sell/20"
                    }`}>{pct}%</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* R:R */}
        {riskReward && showTpSl && (
          <div className="flex items-center justify-between px-2 py-1.5 bg-elevated/30 rounded-lg">
            <span className="text-[8px] text-txt-faint uppercase tracking-wider">Risk/Reward</span>
            <span className={`text-xs font-bold font-mono tabular-nums ${parseFloat(riskReward) >= 2 ? "text-buy" : parseFloat(riskReward) >= 1 ? "text-hold" : "text-sell"}`}>{riskReward}:1</span>
          </div>
        )}

        {/* Error */}
        {displayedError && (
          <div className="px-2.5 py-1.5 rounded-lg border border-sell/20 bg-sell/5 text-[9px] text-sell/80 leading-relaxed">{displayedError}</div>
        )}

        {/* ═══ [8] Primary Action Button ═══ */}
        <button onClick={handleSubmit} disabled={isSubmitDisabled}
          className={`w-full py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer backdrop-blur-sm ${
            (mode === "live" && !isConnected)
              ? "bg-inset text-txt-dim cursor-not-allowed"
              : !marginNum || !currentPrice || validationError
                ? "bg-inset text-txt-dim cursor-not-allowed"
                : side === "LONG"
                  ? "bg-buy/10 text-buy border border-buy/30 hover:bg-buy/20 hover:border-buy/50 active:scale-[0.98]"
                  : "bg-sell/10 text-sell border border-sell/30 hover:bg-sell/20 hover:border-sell/50 active:scale-[0.98]"
          }`}>
          {(mode === "live" && !isConnected)
            ? "Connect Wallet"
            : !marginNum || !currentPrice
              ? "Enter Margin"
              : validationError
                ? "Fix Order"
                : mode === "paper"
                  ? `${side} ${leverage}x · $${marginNum}`
                  : `Place ${side} Order`
          }
        </button>

        {/* ═══ [9] Order Details ═══ */}
        <div className="space-y-1.5 pt-1 border-t border-border-default">
          {[
            { label: "Liq. Price", value: liqPrice > 0 ? `$${fmtPrice(liqPrice, coin)}` : "—" },
            { label: "Order Value", value: notional > 0 ? `$${notional.toFixed(2)}` : "—" },
            { label: "Margin Required", value: marginNum > 0 ? `$${marginNum.toFixed(2)}` : "—" },
            { label: "Slippage", value: "Est: 0.0000% / Max: 8.00%" },
            { label: "Fees", value: "0.0086% / 0.0029%" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[9px] text-txt-faint">{row.label}</span>
              <span className="text-[10px] font-mono text-txt-secondary tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>

        {/* ═══ [10] Equity Section ═══ */}
        {mode === "paper" && paperBalance != null && (
          <div className="space-y-1.5 pt-2 border-t border-border-default">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-txt-faint">Total Equity</span>
              <span className="text-xs font-mono font-bold text-txt-primary tabular-nums">${paperBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-txt-faint">Trading Equity</span>
              <span className="text-[10px] font-mono text-txt-secondary tabular-nums">${(paperBalance - marginNum).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-txt-faint">Unrealized PNL</span>
              <span className="text-[10px] font-mono text-txt-faint">—</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
