"use client";

import type { Signal } from "@/lib/types/signal";
import type { SignalPhase, AIThesis } from "@/lib/hooks/useSignalGeneration";
import type { AIError } from "@/lib/ai/providerErrors";
import type { AIConfig } from "@/lib/types/datasource";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";
import { BarChartIcon, BriefcaseIcon, DataSourceIcon, DocumentIcon, TrendUpIcon } from "@/components/ui/icons";

/* ── Dimension config ── */

const dimLabels: { key: keyof Signal["dimensions"]; label: string; color: string; icon: "etf" | "sentiment" | "macro" | "momentum" | "treasury" }[] = [
  { key: "etfFlow", label: "ETF Flow", color: "#00d4ff", icon: "etf" },
  { key: "sentiment", label: "Sentiment", color: "#8B5CF6", icon: "sentiment" },
  { key: "macro", label: "Macro", color: "#00ff88", icon: "macro" },
  { key: "momentum", label: "Momentum", color: "#ff8800", icon: "momentum" },
  { key: "treasury", label: "Treasury", color: "#ff4488", icon: "treasury" },
];

function DimIcon({ icon }: { icon: (typeof dimLabels)[number]["icon"] }) {
  if (icon === "etf") return <BarChartIcon size={12} />;
  if (icon === "sentiment") return <DocumentIcon size={12} />;
  if (icon === "macro") return <DataSourceIcon size={12} />;
  if (icon === "momentum") return <TrendUpIcon size={12} />;
  return <BriefcaseIcon size={12} />;
}

/* ── Helpers ── */

function fmtPrice(p: number): string {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

/* ── Mini bar ── */

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-mono tabular-nums text-txt-muted w-6 text-right">{value}</span>
    </div>
  );
}

/* ── Phase messages ── */

function phaseMessage(phase: SignalPhase, coin: string): string {
  switch (phase) {
    case "fetching_market_data": return `Fetching live SoDEX and SoSoValue data for ${coin}...`;
    case "computing_signal": return "Computing multi-factor technical signal...";
    case "generating_ai_thesis": return "Generating AI thesis with selected provider...";
    default: return "";
  }
}

/* ── Props ── */

interface Props {
  aiConfig: AIConfig;
  aiProviderLabel: string;
  aiCoin: string;
  onCoinChange: (coin: string) => void;
  analyzing: boolean;
  phase: SignalPhase;
  baseSignal: Signal | null;
  aiThesis: AIThesis | null;
  aiError: AIError | null;
  includeAI: boolean;
  onIncludeAIChange: (v: boolean) => void;
  onGenerate: () => void;
  onPinSignal: () => void;
  onExecuteSignal: () => void;
}

/* ── Component ── */

export default function AISignalGenerator({
  aiConfig,
  aiProviderLabel,
  aiCoin,
  onCoinChange,
  analyzing,
  phase,
  baseSignal,
  aiThesis,
  aiError,
  includeAI,
  onIncludeAIChange,
  onGenerate,
  onPinSignal,
  onExecuteSignal,
}: Props) {
  const displaySignal = baseSignal;
  const hasResult = displaySignal && !analyzing;
  const signalAccent = displaySignal?.action === "LONG"
    ? "var(--color-buy)"
    : displaySignal?.action === "SHORT"
      ? "var(--color-sell)"
      : "var(--color-hold)";
  const displayAction = displaySignal?.action === "HOLD" ? "NO TRADE" : displaySignal?.action;

  return (
    <div className="bg-card border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-elevated/30 border border-border-default flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-txt-secondary" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H14c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
                <line x1="10" y1="18" x2="14" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-txt-primary">Signal Generator</h3>
              <p className="text-[9px] text-txt-faint">
                {includeAI ? `${aiProviderLabel}${aiConfig.model ? ` / ${aiConfig.model}` : ""}` : "Technical Analysis Engine"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={aiCoin}
              onChange={(e) => onCoinChange(e.target.value)}
              className="bg-elevated border border-border-default rounded px-2 py-1 text-xs text-txt-primary font-mono focus:border-border-muted outline-none cursor-pointer appearance-none pr-6"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 6px center",
              }}
            >
              {["BTC", "ETH", "SOL", "AVAX", "LINK"].map((c) => (
                <option key={c} value={c}>{c}/USDC</option>
              ))}
            </select>
            <Button variant="primary" size="sm" loading={analyzing} onClick={onGenerate}>
              {analyzing ? "Generating..." : "Generate Signal"}
            </Button>
          </div>
        </div>

        {/* AI Thesis toggle */}
        <div className="flex items-center justify-between mt-3 py-2 px-3 rounded-lg bg-elevated/30 border border-border-default">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={includeAI}
              onClick={() => onIncludeAIChange(!includeAI)}
              className={`
                relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
                ${includeAI ? "bg-txt-secondary" : "bg-border-default"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform ring-0 transition duration-200 ease-in-out
                  ${includeAI ? "translate-x-4" : "translate-x-0"}
                `}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-txt-primary">Include AI Thesis</span>
              <p className="text-[10px] text-txt-muted mt-0.5">
                Adds AI reasoning, risk notes, and scenario analysis
              </p>
            </div>
          </div>
          <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
            includeAI ? "bg-elevated text-txt-primary" : "bg-elevated text-txt-faint"
          }`}>
            {includeAI ? "ON" : "OFF"}
          </span>
        </div>

        {/* AI config warnings */}
        {includeAI && !aiConfig.apiKey && (
          <p className="text-[10px] text-hold mt-2 ml-1">
            No API key configured. Will attempt server default.
          </p>
        )}
      </div>

      {/* Empty state */}
      {!displaySignal && !analyzing && !aiError && phase === "idle" && (
        <div className="px-4 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-elevated mx-auto mb-3 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p className="text-xs text-txt-muted">Select a pair and generate a signal</p>
          <p className="text-[10px] text-txt-faint mt-1">
            {includeAI
              ? "Multi-dimensional analysis + AI thesis (optional)"
              : "Signal generated from live market data. No AI key required."}
          </p>
        </div>
      )}

      {/* Loading state — phase-aware */}
      {analyzing && (
        <div className="px-4 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-elevated mx-auto mb-3 flex items-center justify-center animate-pulse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-txt-secondary" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H14c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
              <line x1="10" y1="18" x2="14" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
            </svg>
          </div>
          <p className="text-xs text-txt-secondary animate-pulse">{phaseMessage(phase, aiCoin)}</p>
          <p className="text-[10px] text-txt-faint mt-1">ETF Flows · Sentiment · Macro · Momentum · Treasury</p>
        </div>
      )}

      {/* Error state — full error, no base signal */}
      {aiError && !displaySignal && !analyzing && phase === "error" && (
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-sell)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-xs text-sell">{aiError.message}</p>
          </div>
          {aiError.code === "not_configured" && (
            <p className="text-[10px] text-txt-faint mt-1">
              Base signal still works without AI. Uncheck &quot;Include AI Thesis&quot; or configure a provider in Settings.
            </p>
          )}
        </div>
      )}

      {/* Partial success — base signal + AI error warning */}
      {hasResult && aiError && phase === "partial_success" && (
        <div className="px-4 py-2 bg-hold-muted/15 border-b border-hold/20">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-hold)" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-[10px] text-hold">{aiError.message}</p>
            <span className="text-[10px] text-txt-faint">Showing base signal.</span>
            {aiError.retryable && (
              <button onClick={onGenerate} className="text-[10px] text-txt-secondary hover:underline cursor-pointer ml-auto">
                Retry AI
              </button>
            )}
          </div>
        </div>
      )}

      {/* Signal result */}
      {hasResult && displaySignal && (
        <div className="p-4 space-y-4">
          {/* Success note for base-only mode */}
          {phase === "success" && !aiThesis && (
            <div className="flex items-center gap-1.5 text-[9px] text-buy">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Generated from live market data
            </div>
          )}

          {/* Signal overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ConfidenceGauge value={displaySignal.confidence} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-txt-primary">{displaySignal.pair}</span>
                  <span
                    className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: `color-mix(in srgb, ${signalAccent} 12%, transparent)`, color: signalAccent }}
                  >
                    {displayAction}
                  </span>
                  {aiThesis && (
                    <span className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-accent-muted text-accent">
                      AI
                    </span>
                  )}
                </div>
                <span className="text-xs text-txt-muted font-mono">{fmtPrice(displaySignal.price)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onPinSignal}>
                Pin to Chart
              </Button>
              <Button variant="primary" size="sm" onClick={onExecuteSignal}>
                Execute
              </Button>
            </div>
          </div>

          {/* Thesis */}
          <div className="bg-elevated/50 rounded-lg p-3 border-l-2" style={{ borderLeftColor: signalAccent }}>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">
              {aiThesis ? "AI Thesis" : "Technical Analysis"}
            </p>
            <p className="text-sm text-txt-secondary leading-relaxed">
              &ldquo;{aiThesis?.reasoning ?? displaySignal.reasoning}&rdquo;
            </p>
          </div>

          {/* Score breakdown */}
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Score Breakdown</p>
            <div className="grid grid-cols-5 gap-2">
              {dimLabels.map((d) => {
                const score = displaySignal.dimensions[d.key];
                const detail = aiThesis?.dimensionDetails?.[d.key]?.detail ?? displaySignal.dimensionDetails?.[d.key]?.detail;
                return (
                  <div key={d.key} className="bg-elevated/30 rounded-lg p-2 text-center">
                    <span className="text-txt-secondary inline-flex mb-1"><DimIcon icon={d.icon} /></span>
                    <span className="text-[9px] font-semibold block mb-1" style={{ color: d.color }}>{d.label}</span>
                    <span className="text-sm font-bold font-mono block" style={{ color: d.color }}>{score}</span>
                    <MiniBar value={score} color={d.color} />
                    {detail && (
                      <p className="text-[8px] text-txt-faint mt-1 leading-tight line-clamp-2">{detail}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade plan */}
          {displaySignal.execution.entry > 0 && (
            <div>
              <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Trade Plan</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Entry", value: fmtPrice(displaySignal.execution.entry), color: "text-accent" },
                  { label: "Take Profit", value: displaySignal.execution.takeProfit > 0 ? fmtPrice(displaySignal.execution.takeProfit) : "—", color: "text-buy" },
                  { label: "Stop Loss", value: displaySignal.execution.stopLoss > 0 ? fmtPrice(displaySignal.execution.stopLoss) : "—", color: "text-sell" },
                  { label: "Risk/Reward", value: displaySignal.execution.riskReward || "—", color: "text-txt-primary" },
                ].map((item) => (
                  <div key={item.label} className="bg-elevated/30 rounded-lg p-2 text-center">
                    <p className="text-[9px] text-txt-faint">{item.label}</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border-default">
            <div className="flex flex-wrap gap-1">
              {displaySignal.sources.map((src) => (
                <span key={src} className="text-[8px] text-txt-faint bg-elevated px-1.5 py-0.5 rounded">{src}</span>
              ))}
            </div>
            <span className="text-[9px] text-txt-faint">{displaySignal.timeAgo}</span>
          </div>
        </div>
      )}
    </div>
  );
}
