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
  isPaperCapitalConfigured?: boolean;
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

export default function OrderForm({ pair, coin, currentPrice, signal, isConnected, paperBalance, isPaperCapitalConfigured = true, mode = "paper", tradingType, error, onExecute }: Props) {
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
    if (mode === "live") return "Live SoDEX perps execution is locked until wallet-signature authentication and order ownership checks are implemented.";
    if (!entry) return "Market price is not available.";
    if (!marginNum) return null;
    if (mode === "paper" && !isPaperCapitalConfigured) return "Choose paper capital before opening paper positions.";
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
  }, [currentPrice, takeProfit, stopLoss, marginNum, mode, paperBalance, isPaperCapitalConfigured, side, liqPrice]);

  // Slider → margin sync
  useEffect(() => {
    if (sliderPct > 0 && paperBalance && paperBalance > 0) {
      setMargin(((sliderPct / 100) * paperBalance).toFixed(2));
    }
  }, [sliderPct, paperBalance]);

  const handleSubmit = () => {
    if (!isConnected || !marginNum || !currentPrice || validationError) return;
    onExecute({ side, leverage, margin: marginNum, quantity, takeProfit, stopLoss });
  };

  const walletRequiredError = !isConnected ? "Connect wallet before opening paper or live positions." : null;
  const paperCapitalRequiredError = mode === "paper" && isConnected && !isPaperCapitalConfigured ? "Choose paper capital from $100 to $10,000 before opening paper positions." : null;
  const isSubmitDisabled = !isConnected || (mode === "paper" && !isPaperCapitalConfigured) || !marginNum || !currentPrice || Boolean(validationError);
  const displayedError = error ?? walletRequiredError ?? paperCapitalRequiredError ?? (mode === "live" || marginNum > 0 ? validationError : null);
  const sideAccent = side === "LONG" ? "text-buy" : "text-sell";

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="border-b border-border-default px-3 pb-3 pt-2.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-txt-muted">Execute Trade</p>
            <p className="mt-0.5 font-mono text-[11px] font-semibold text-txt-primary">{pair}</p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
            mode === "paper" ? "border-hold/25 bg-hold/10 text-hold" : "border-border-muted bg-elevated/40 text-txt-secondary"
          }`}>
            {mode === "live" ? "live read-only" : "paper mode"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border-default bg-inset p-1">
          <button onClick={() => setSide("LONG")} className={`group rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.98] ${
            side === "LONG"
              ? "cursor-pointer border-buy/35 bg-buy/10 shadow-[0_0_16px_rgba(0,255,136,0.10)]"
              : "cursor-pointer border-transparent text-txt-muted hover:border-buy/15 hover:bg-buy/[0.04] hover:text-txt-primary"
          }`}>
            <span className={`block text-xs font-bold ${side === "LONG" ? "text-buy" : ""}`}>LONG</span>
            <span className="mt-0.5 block text-[8px] text-txt-muted group-hover:text-txt-secondary">Buy / bullish</span>
          </button>
          <button onClick={() => setSide("SHORT")} className={`group rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.98] ${
            side === "SHORT"
              ? "cursor-pointer border-sell/35 bg-sell/10 shadow-[0_0_16px_rgba(255,68,85,0.10)]"
              : "cursor-pointer border-transparent text-txt-muted hover:border-sell/15 hover:bg-sell/[0.04] hover:text-txt-primary"
          }`}>
            <span className={`block text-xs font-bold ${side === "SHORT" ? "text-sell" : ""}`}>SHORT</span>
            <span className="mt-0.5 block text-[8px] text-txt-muted group-hover:text-txt-secondary">Sell / bearish</span>
          </button>
        </div>
      </div>

      <div className="space-y-3.5 p-3">
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-txt-muted">Order Setup</span>
            <span className="font-mono text-[9px] text-txt-secondary">
              {currentPrice ? `$${fmtPrice(currentPrice, coin)}` : "Price unavailable"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border-default bg-inset p-1">
            {(["Market", "Limit"] as const).map((type) => (
              <button key={type} onClick={() => setOrderType(type)} className={`rounded-lg border py-1.5 text-[10px] font-semibold transition-all ${
                orderType === type
                  ? "cursor-pointer border-hold/25 bg-elevated text-hold shadow-sm"
                  : "cursor-pointer border-transparent text-txt-muted hover:bg-elevated/40 hover:text-txt-primary"
              }`}>
                {type}
              </button>
            ))}
          </div>

          {orderType === "Limit" && (
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-medium text-txt-secondary">Limit price</span>
              <div className="flex items-center gap-2 rounded-lg border border-border-default bg-inset px-3 py-2 transition-all focus-within:border-hold/50 focus-within:ring-2 focus-within:ring-hold/10 hover:border-border-muted">
                <span className="text-xs text-txt-muted">$</span>
                <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={currentPrice ? fmtPrice(currentPrice, coin) : "0.00"}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm font-semibold text-txt-primary outline-none placeholder:text-txt-dim" />
                <span className="text-[9px] font-semibold text-txt-muted">USDC</span>
              </div>
            </label>
          )}
        </section>

        <section className="space-y-2.5 border-t border-border-default pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-txt-muted">Position Size</span>
            <span className="font-mono text-[10px] text-txt-secondary">
              {paperBalance != null ? `$${paperBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} available
            </span>
          </div>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-medium text-txt-secondary">Margin</span>
              {paperBalance && paperBalance > 0 && (
                <button type="button" onClick={() => { setMargin(paperBalance.toFixed(2)); setSliderPct(100); }}
                  className="cursor-pointer rounded-md border border-hold/20 bg-hold/[0.06] px-2 py-0.5 text-[8px] font-bold text-hold transition-colors hover:border-hold/40 hover:bg-hold/12">
                  USE MAX
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border-default bg-inset px-3 py-2.5 transition-all focus-within:border-hold/50 focus-within:ring-2 focus-within:ring-hold/10 hover:border-border-muted">
              <span className="text-sm text-txt-muted">$</span>
              <input type="number" value={margin} onChange={(e) => { setMargin(e.target.value); setSliderPct(0); }} placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent font-mono text-base font-bold text-txt-primary outline-none placeholder:text-txt-dim" />
              <span className="text-[9px] font-semibold text-txt-muted">USDC</span>
            </div>
          </label>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={100} step={5} value={sliderPct} onChange={(e) => setSliderPct(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-elevated accent-hold" />
              <span className="min-w-[44px] rounded-md border border-hold/20 bg-hold/[0.06] px-2 py-1 text-center font-mono text-[10px] font-bold tabular-nums text-hold">{sliderPct}%</span>
            </div>
            <div className="flex justify-between px-0.5 text-[8px] text-txt-muted">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowLeverageSettings(!showLeverageSettings)}
              className={`cursor-pointer rounded-xl border p-2.5 text-left transition-all ${
                showLeverageSettings ? "border-hold/35 bg-hold/[0.07]" : "border-border-default bg-inset hover:border-hold/25 hover:bg-hold/[0.04]"
              }`}>
              <span className="block text-[8px] font-semibold uppercase tracking-wider text-txt-muted">Leverage</span>
              <span className="mt-1 flex items-end justify-between">
                <span className="font-mono text-base font-bold text-hold">{leverage}x</span>
                <span className="text-[8px] text-txt-muted">max {maxLeverage}x</span>
              </span>
            </button>

            <div className="relative">
              <button onClick={() => setShowMarginDropdown(!showMarginDropdown)}
                className={`h-full w-full cursor-pointer rounded-xl border p-2.5 text-left transition-all ${
                  showMarginDropdown ? "border-hold/35 bg-hold/[0.07]" : "border-border-default bg-inset hover:border-hold/25 hover:bg-hold/[0.04]"
                }`}>
                <span className="block text-[8px] font-semibold uppercase tracking-wider text-txt-muted">Margin Mode</span>
                <span className="mt-1 flex items-end justify-between">
                  <span className="text-xs font-bold text-txt-primary">{marginMode}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-muted"><path d="M19 9l-7 7-7-7" /></svg>
                </span>
              </button>
              {showMarginDropdown && (
                <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border-muted bg-card shadow-xl">
                  {(["Isolated", "Cross"] as const).map((item) => (
                    <button key={item} onClick={() => { setMarginMode(item); setShowMarginDropdown(false); }}
                      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[11px] font-medium transition-colors ${
                        marginMode === item ? "bg-hold/10 text-hold" : "text-txt-secondary hover:bg-elevated/40 hover:text-txt-primary"
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${marginMode === item ? "bg-hold" : "bg-border-muted"}`} />
                      <span>{item}</span>
                      <span className="ml-auto text-[8px] text-txt-muted">{item === "Isolated" ? "Controlled" : "Flexible"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showLeverageSettings && (
            <div className="space-y-3 rounded-xl border border-hold/25 bg-hold/[0.04] p-3 shadow-[0_0_20px_rgba(255,136,0,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-txt-primary">Adjust leverage</p>
                  <p className="mt-0.5 text-[8px] leading-relaxed text-txt-muted">Higher leverage increases liquidation risk.</p>
                </div>
                <span className="rounded-lg border border-hold/25 bg-hold/10 px-2.5 py-1 font-mono text-sm font-bold text-hold">{leverage}x</span>
              </div>
              <input type="range" min={1} max={maxLeverage} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-hold drop-shadow-[0_0_7px_rgba(255,136,0,0.45)]" />
              <div className="flex items-center justify-between text-[8px] text-txt-muted">
                <span>1x minimum</span>
                <span className="font-mono text-txt-secondary">${notional.toFixed(0)} notional</span>
                <span>{maxLeverage}x profile max</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2 border-t border-border-default pt-3.5">
          <button type="button" onClick={() => setShowTpSl(!showTpSl)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
              showTpSl ? "border-hold/25 bg-hold/[0.04]" : "border-border-default bg-inset hover:border-border-muted hover:bg-elevated/20"
            }`}>
            <span>
              <span className="block text-[10px] font-semibold text-txt-primary">Risk protection</span>
              <span className="mt-0.5 block text-[8px] text-txt-muted">Set take profit and stop loss</span>
            </span>
            <span className={`relative h-5 w-9 rounded-full border transition-colors ${showTpSl ? "border-hold/35 bg-hold/25" : "border-border-muted bg-elevated"}`}>
              <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${showTpSl ? "left-[17px] bg-hold" : "left-0.5 bg-txt-muted"}`} />
            </span>
          </button>

          {showTpSl && (
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-xl border border-buy/20 bg-buy/[0.035] p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-buy">Take Profit</label>
                  {takeProfit && <span className="font-mono text-[9px] text-buy">{tpPercent ? `+${tpPercent}%` : `$${fmtPrice(parseFloat(takeProfit), coin)}`}</span>}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_58px] gap-1.5">
                  <div className="flex items-center rounded-lg border border-buy/15 bg-inset px-2.5 focus-within:border-buy/45">
                    <span className="mr-1 text-[9px] text-txt-muted">$</span>
                    <input type="number" value={takeProfit} onChange={(e) => { setTakeProfit(e.target.value); setTpPercent(""); }} placeholder="Price"
                      className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[11px] font-semibold text-txt-primary outline-none placeholder:text-txt-dim" />
                  </div>
                  <div className="flex items-center rounded-lg border border-buy/15 bg-inset px-2 focus-within:border-buy/45">
                    <input type="number" value={tpPercent} onChange={(e) => setTpPercent(e.target.value)} placeholder="0"
                      className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[11px] font-semibold text-txt-primary outline-none placeholder:text-txt-dim" />
                    <span className="text-[9px] text-txt-muted">%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-sell/20 bg-sell/[0.035] p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-sell">Stop Loss</label>
                  {stopLoss && <span className="font-mono text-[9px] text-sell">{slPercent ? `-${slPercent}%` : `$${fmtPrice(parseFloat(stopLoss), coin)}`}</span>}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_58px] gap-1.5">
                  <div className="flex items-center rounded-lg border border-sell/15 bg-inset px-2.5 focus-within:border-sell/45">
                    <span className="mr-1 text-[9px] text-txt-muted">$</span>
                    <input type="number" value={stopLoss} onChange={(e) => { setStopLoss(e.target.value); setSlPercent(""); }} placeholder="Price"
                      className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[11px] font-semibold text-txt-primary outline-none placeholder:text-txt-dim" />
                  </div>
                  <div className="flex items-center rounded-lg border border-sell/15 bg-inset px-2 focus-within:border-sell/45">
                    <input type="number" value={slPercent} onChange={(e) => setSlPercent(e.target.value)} placeholder="0"
                      className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[11px] font-semibold text-txt-primary outline-none placeholder:text-txt-dim" />
                    <span className="text-[9px] text-txt-muted">%</span>
                  </div>
                </div>
              </div>

              {riskReward && (
                <div className="flex items-center justify-between rounded-lg border border-border-default bg-inset px-2.5 py-2">
                  <span className="text-[9px] font-medium text-txt-secondary">Risk / Reward</span>
                  <span className={`font-mono text-xs font-bold tabular-nums ${parseFloat(riskReward) >= 1 ? "text-buy" : "text-sell"}`}>{riskReward}:1</span>
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 group">
            <span>
              <span className="block text-[9px] font-medium text-txt-secondary group-hover:text-txt-primary">Reduce only</span>
              <span className="block text-[8px] text-txt-muted">Only reduce an existing position</span>
            </span>
            <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border border-border-default bg-inset accent-hold" />
          </label>
        </section>

        <section className="space-y-2 border-t border-border-default pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-txt-muted">Order Preview</span>
            <span className={`text-[9px] font-bold ${sideAccent}`}>{side} · {leverage}x</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border-default bg-inset">
            <div className="grid grid-cols-2 divide-x divide-border-default border-b border-border-default">
              <div className="p-2.5">
                <p className="text-[8px] uppercase tracking-wider text-txt-muted">Notional</p>
                <p className="mt-1 font-mono text-xs font-bold tabular-nums text-txt-primary">{notional > 0 ? `$${notional.toFixed(2)}` : "—"}</p>
              </div>
              <div className="p-2.5">
                <p className="text-[8px] uppercase tracking-wider text-txt-muted">Liquidation</p>
                <p className={`mt-1 font-mono text-xs font-bold tabular-nums ${liqPrice > 0 ? "text-sell" : "text-txt-dim"}`}>{liqPrice > 0 ? `$${fmtPrice(liqPrice, coin)}` : "—"}</p>
              </div>
            </div>
            <div className="space-y-1.5 p-2.5">
              {[
                { label: "Entry", value: currentPrice ? `$${fmtPrice(currentPrice, coin)}` : "—" },
                { label: "Position size", value: quantity > 0 ? `${quantity.toFixed(6)} ${coin}` : "—" },
                { label: "Margin required", value: marginNum > 0 ? `$${marginNum.toFixed(2)} USDC` : "—" },
                { label: "Fees", value: "0.0086% / 0.0029%" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-[8px] text-txt-muted">{row.label}</span>
                  <span className="truncate font-mono text-[9px] text-txt-secondary tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {displayedError && (
          <div className="rounded-xl border border-sell/25 bg-sell/[0.06] px-3 py-2 text-[9px] leading-relaxed text-sell">{displayedError}</div>
        )}

        <button onClick={handleSubmit} disabled={isSubmitDisabled}
          className={`w-full rounded-xl border py-3 text-xs font-bold transition-all ${
            isSubmitDisabled
              ? "cursor-not-allowed border-border-default bg-inset text-txt-dim"
              : side === "LONG"
                ? "cursor-pointer border-buy/45 bg-buy/15 text-buy shadow-[0_0_22px_rgba(0,255,136,0.12)] hover:bg-buy/25 hover:shadow-[0_0_26px_rgba(0,255,136,0.20)] active:scale-[0.985]"
                : "cursor-pointer border-sell/45 bg-sell/15 text-sell shadow-[0_0_22px_rgba(255,68,85,0.12)] hover:bg-sell/25 hover:shadow-[0_0_26px_rgba(255,68,85,0.20)] active:scale-[0.985]"
          }`}>
          {!isConnected
            ? "Connect Wallet to Trade"
            : mode === "live"
              ? "Live Execution Locked"
            : mode === "paper" && !isPaperCapitalConfigured
              ? "Set Paper Capital"
              : !marginNum || !currentPrice
                ? "Enter Margin to Continue"
                : validationError
                  ? "Review Order Details"
                  : `Open ${side} · ${leverage}x`
          }
        </button>

        {mode === "paper" && isPaperCapitalConfigured && paperBalance != null && (
          <div className="flex items-center justify-between rounded-lg border border-border-default bg-elevated/15 px-2.5 py-2">
            <span className="text-[8px] text-txt-muted">Paper equity after margin</span>
            <span className="font-mono text-[10px] font-semibold tabular-nums text-txt-secondary">${(paperBalance - marginNum).toFixed(2)} USDC</span>
          </div>
        )}
      </div>
    </div>
  );
}
