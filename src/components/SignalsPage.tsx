"use client";

import { useState } from "react";
import { signals, Signal } from "@/lib/mock-data";
import type { SoDEXTicker } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";
import type { SignalDimensions } from "@/lib/use-signals";

const actionMeta: Record<Signal["action"], { bg: string; border: string; text: string; accent: string; label: string }> = {
  BUY: { bg: "bg-[#0d2a1a]", border: "border-[#00ff8840]", text: "text-[#00ff88]", accent: "#00ff88", label: "Bullish — Buy" },
  SELL: { bg: "bg-[#2a0d0d]", border: "border-[#ff444440]", text: "text-[#ff4444]", accent: "#ff4444", label: "Bearish — Sell" },
  HOLD: { bg: "bg-[#1a1a0d]", border: "border-[#ff880040]", text: "text-[#ff8800]", accent: "#ff8800", label: "Neutral — Hold" },
};

const dimLabels = [
  { key: "etfFlow" as const, label: "ETF Flow", color: "#00d4ff", icon: "📊" },
  { key: "sentiment" as const, label: "Sentiment", color: "#7b2fff", icon: "📰" },
  { key: "macro" as const, label: "Macro", color: "#00ff88", icon: "🌐" },
  { key: "momentum" as const, label: "Momentum", color: "#ff8800", icon: "📈" },
  { key: "treasury" as const, label: "Treasury", color: "#ff4488", icon: "🏛️" },
];

function actionRationale(signal: Signal): string[] {
  const points: string[] = [];
  const dims = signal.dimensions;
  const details = signal.dimensionDetails;

  if (dims.etfFlow >= 80) points.push(details?.etfFlow?.detail || `ETF inflows strong at score ${dims.etfFlow}/100 — institutional capital rotating in`);
  else if (dims.etfFlow < 50) points.push(details?.etfFlow?.detail || `ETF flows weakening at score ${dims.etfFlow}/100 — institutional demand softening`);

  if (dims.sentiment >= 80) points.push(details?.sentiment?.detail || `News sentiment highly bullish at ${dims.sentiment}/100 — media & social aligned positive`);
  else if (dims.sentiment < 50) points.push(details?.sentiment?.detail || `Sentiment bearish at ${dims.sentiment}/100 — negative headlines dominating`);

  if (dims.momentum >= 80) points.push(details?.momentum?.detail || `Price momentum strong at ${dims.momentum}/100 — trend is your friend`);
  else if (dims.momentum < 45) points.push(details?.momentum?.detail || `Momentum weakening at ${dims.momentum}/100 — price action deteriorating`);

  if (dims.macro >= 75) points.push(details?.macro?.detail || `Macro backdrop supportive at ${dims.macro}/100 — risk-on environment`);
  else if (dims.macro < 50) points.push(details?.macro?.detail || `Macro headwinds at ${dims.macro}/100 — caution warranted`);

  if (dims.treasury >= 70) points.push(details?.treasury?.detail || `Institutional treasury adoption at ${dims.treasury}/100 — smart money accumulating`);
  else if (dims.treasury < 50) points.push(details?.treasury?.detail || `Treasury data muted at ${dims.treasury}/100 — no strong institutional signal`);

  return points;
}

interface Props {
  tickers?: SoDEXTicker[] | null;
  liveDims?: Record<string, SignalDimensions> | null;
  overallScores?: Record<string, number> | null;
  weights?: Record<string, Record<string, number>> | null;
  cappedDims?: Record<string, string[]> | null;
}

export default function SignalsPage({ tickers, liveDims, overallScores, weights, cappedDims }: Props) {
  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">All Signals</h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-[#00ff8820] text-[#00ff88] border border-[#00ff8830] rounded">LIVE PRICES</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {signals.map((s) => {
          const meta = actionMeta[s.action];
          const sodSym = pairToSodexSymbol(s.pair);
          const live = sodSym ? tickerMap.get(sodSym) : undefined;
          const price = live ? parseFloat(live.lastPx) : s.price;
          const chg = live ? live.changePct : s.change24h;
          const isOpen = expanded.has(s.id);
          const coin = s.pair.split("/")[0];
          const dimDetails = liveDims?.[coin];
          const rationale = actionRationale(s);

          return (
            <div key={s.id} className={`${meta.bg} ${meta.border} border rounded-xl overflow-hidden`}>
              {/* Header */}
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">{s.pair}</span>
                    <span
                      className="px-2.5 py-1 text-xs font-bold rounded border"
                      style={{ color: meta.accent, borderColor: meta.accent }}
                    >
                      {s.action}
                    </span>
                    {live && <span className="text-[9px] text-[#00ff88]">LIVE</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-white font-semibold font-mono">
                      ${typeof price === "number" ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price}
                    </span>
                    <span className={`text-xs ml-2 ${chg >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                      {chg >= 0 ? "+" : ""}{typeof chg === "number" ? chg.toFixed(1) : chg}%
                    </span>
                  </div>
                </div>

                {/* Main reasoning */}
                <p className="text-sm text-[#cccccc] leading-relaxed mb-4">{s.reasoning}</p>

                {/* Dimension bars */}
                <div className="flex flex-col gap-1.5 mb-4">
                  {dimLabels.map((d) => {
                    const liveScore = dimDetails?.[d.key]?.score;
                    const liveDetail = dimDetails?.[d.key]?.detail;
                    const score = liveScore ?? s.dimensions[d.key];
                    const detail = liveDetail || s.dimensionDetails?.[d.key]?.detail;
                    const coinWeights = weights?.[coin];
                    const coinCapped = cappedDims?.[coin];
                    const weight = coinWeights?.[d.key];
                    const isCapped = coinCapped?.includes(d.key);

                    return (
                      <div key={d.key} className="flex items-center gap-2">
                        <span className="text-[10px] w-20 shrink-0 text-[#888888]">{d.label}</span>
                        <div className="flex-1 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${score}%`, backgroundColor: d.color }}
                          />
                        </div>
                        <span className="text-[10px] w-8 text-right" style={{ color: d.color }}>{score}</span>
                        {weight != null && (
                          <span className="text-[10px] w-8 text-right text-[#666677]">{weight}%</span>
                        )}
                        {isCapped && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-[#ff444415] text-[#ff4444]" title="Capped — outlier detected, weight capped at 8%">
                            CAP
                          </span>
                        )}
                        {detail && (
                          <span className="text-[10px] text-[#555566] hidden lg:block w-48 truncate" title={detail}>
                            {detail}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confidence + overall + toggle */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#666677]">
                      Confidence: <span className="font-bold" style={{ color: meta.accent }}>{s.confidence}%</span>
                    </span>
                    {overallScores?.[coin] != null && (
                      <span className="text-[10px] text-[#666677]">
                        Overall: <span className="font-bold text-[#00d4ff]">{overallScores[coin]}/100</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(s.id)}
                    className="text-[10px] text-[#7b2fff] hover:text-[#9b4fff] transition-colors"
                  >
                    {isOpen ? "Hide Analysis" : "Show Analysis"}
                  </button>
                </div>
              </div>

              {/* Expanded analysis */}
              {isOpen && (
                <div className="border-t border-[#ffffff10] p-5 space-y-4 bg-[#00000020]">
                  {/* Why this signal */}
                  <div>
                    <h4 className="text-xs font-semibold text-white mb-2" style={{ color: meta.accent }}>
                      Why {s.action}?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dimLabels.map((d) => {
                        const liveScore = dimDetails?.[d.key]?.score;
                        const liveDetail = dimDetails?.[d.key]?.detail;
                        const score = liveScore ?? s.dimensions[d.key];
                        const detail = liveDetail || s.dimensionDetails?.[d.key]?.detail || `Score: ${score}/100`;
                        const coinWeights = weights?.[coin];
                        const coinCapped = cappedDims?.[coin];
                        const weight = coinWeights?.[d.key];
                        const isCapped = coinCapped?.includes(d.key);

                        return (
                          <div key={d.key} className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs">{d.icon}</span>
                              <span className="text-[11px] font-semibold" style={{ color: d.color }}>{d.label}</span>
                              {weight != null && (
                                <span className="text-[9px] text-[#666677]">wt: {weight}%</span>
                              )}
                              {isCapped && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-[#ff444415] text-[#ff4444]" title="Capped — outlier, weight capped at 8%">CAP</span>
                              )}
                              <span className="text-[10px] font-bold ml-auto" style={{ color: d.color }}>{score}/100</span>
                            </div>
                            <p className="text-[10px] text-[#888899] leading-relaxed">{detail}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key rationales */}
                  {rationale.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-white mb-2">Key Factors</h4>
                      <ul className="space-y-1">
                        {rationale.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-[#aaaabb]">
                            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Execution plan */}
                  {s.execution.orderType !== "No action" && (
                    <div>
                      <h4 className="text-xs font-semibold text-white mb-2">Execution Plan</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Entry</span>
                          <p className="text-white font-mono font-semibold">${s.execution.entry.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Take Profit</span>
                          <p className="text-[#00ff88] font-mono font-semibold">
                            {s.execution.takeProfit > 0 ? `$${s.execution.takeProfit.toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Stop Loss</span>
                          <p className="text-[#ff4444] font-mono font-semibold">
                            {s.execution.stopLoss > 0 ? `$${s.execution.stopLoss.toLocaleString()}` : "—"}
                          </p>
                        </div>
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Position</span>
                          <p className="text-white font-semibold">{s.execution.positionSize}</p>
                        </div>
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Risk/Reward</span>
                          <p className="text-white font-semibold">{s.execution.riskReward}</p>
                        </div>
                        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-2">
                          <span className="text-[#666677]">Type</span>
                          <p className="text-[#7b2fff] font-semibold">{s.execution.orderType}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-[#444455]">Data sources:</span>
                    {s.sources.map((src) => (
                      <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-[#ffffff08] text-[#666677] border border-[#ffffff10]">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="px-5 pb-3">
                <span className="text-[10px] text-[#444455]">{s.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
