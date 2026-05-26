"use client";

import type { Signal } from "@/lib/types/signal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfidenceGauge from "@/components/ui/ConfidenceGauge";

/* ── Dimension config ── */

const dimLabels: { key: keyof Signal["dimensions"]; label: string; color: string; icon: string }[] = [
  { key: "etfFlow", label: "ETF Flow", color: "#00d4ff", icon: "📊" },
  { key: "sentiment", label: "Sentiment", color: "#8B5CF6", icon: "📰" },
  { key: "macro", label: "Macro", color: "#00ff88", icon: "🌐" },
  { key: "momentum", label: "Momentum", color: "#ff8800", icon: "📈" },
  { key: "treasury", label: "Treasury", color: "#ff4488", icon: "🏛" },
];

const actionAccent: Record<string, string> = {
  BUY: "#00E676",
  SELL: "#EF4444",
  HOLD: "#F59E0B",
};

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

/* ── Props ── */

interface Props {
  aiConfig: any;
  aiProviderLabel: string;
  aiCoin: string;
  onCoinChange: (coin: string) => void;
  analyzing: boolean;
  aiSignal: Signal | null;
  aiError: string | null;
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
  aiSignal,
  aiError,
  onGenerate,
  onPinSignal,
  onExecuteSignal,
}: Props) {
  const accent = aiSignal ? (actionAccent[aiSignal.action] ?? "#00E5A8") : "#00E5A8";

  return (
    <div
      className="bg-card border border-border-default rounded-lg overflow-hidden"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H14c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
              <line x1="10" y1="18" x2="14" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-txt-primary">AI Signal Thesis</h3>
            <p className="text-[9px] text-txt-faint">{aiProviderLabel}{aiConfig.model ? ` / ${aiConfig.model}` : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={aiCoin}
            onChange={(e) => onCoinChange(e.target.value)}
            className="bg-elevated border border-border-default rounded px-2 py-1 text-xs text-txt-primary font-mono focus:border-accent/50 outline-none cursor-pointer appearance-none pr-6"
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
            {analyzing ? "Analyzing..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!aiSignal && !analyzing && !aiError && (
        <div className="px-4 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-elevated mx-auto mb-3 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p className="text-xs text-txt-muted">Select an asset and generate an AI signal</p>
          <p className="text-[10px] text-txt-faint mt-1">Multi-dimensional analysis across 5 data sources</p>
        </div>
      )}

      {/* Loading state */}
      {analyzing && (
        <div className="px-4 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 mx-auto mb-3 flex items-center justify-center animate-pulse">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H14c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
              <line x1="10" y1="18" x2="14" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
            </svg>
          </div>
          <p className="text-xs text-accent animate-pulse">Analyzing {aiCoin} across 5 dimensions...</p>
          <p className="text-[10px] text-txt-faint mt-1">ETF Flows · Sentiment · Macro · Momentum · Treasury</p>
        </div>
      )}

      {/* Error state */}
      {aiError && !analyzing && (
        <div className="px-4 py-4 bg-sell-muted/20">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-sell)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-xs text-sell">{aiError}</p>
          </div>
        </div>
      )}

      {/* Signal result */}
      {aiSignal && !analyzing && (
        <div className="p-4 space-y-4">
          {/* Signal overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ConfidenceGauge value={aiSignal.confidence} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-txt-primary">{aiSignal.pair}</span>
                  <span
                    className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${accent}20`, color: accent }}
                  >
                    {aiSignal.action}
                  </span>
                </div>
                <span className="text-xs text-txt-muted font-mono">{fmtPrice(aiSignal.price)}</span>
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
          <div className="bg-elevated/50 rounded-lg p-3 border-l-2" style={{ borderLeftColor: accent }}>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1">Signal Thesis</p>
            <p className="text-sm text-txt-secondary leading-relaxed">&ldquo;{aiSignal.reasoning}&rdquo;</p>
          </div>

          {/* Score breakdown */}
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Score Breakdown</p>
            <div className="grid grid-cols-5 gap-2">
              {dimLabels.map((d) => {
                const score = aiSignal.dimensions[d.key];
                const detail = aiSignal.dimensionDetails?.[d.key]?.detail;
                return (
                  <div key={d.key} className="bg-elevated/30 rounded-lg p-2 text-center">
                    <span className="text-xs block mb-1">{d.icon}</span>
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
          {aiSignal.execution.entry > 0 && (
            <div>
              <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Trade Plan</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Entry", value: fmtPrice(aiSignal.execution.entry), color: "text-accent" },
                  { label: "Take Profit", value: aiSignal.execution.takeProfit > 0 ? fmtPrice(aiSignal.execution.takeProfit) : "—", color: "text-buy" },
                  { label: "Stop Loss", value: aiSignal.execution.stopLoss > 0 ? fmtPrice(aiSignal.execution.stopLoss) : "—", color: "text-sell" },
                  { label: "Risk/Reward", value: aiSignal.execution.riskReward || "—", color: "text-txt-primary" },
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
              {aiSignal.sources.map((src) => (
                <span key={src} className="text-[8px] text-txt-faint bg-elevated px-1.5 py-0.5 rounded">{src}</span>
              ))}
            </div>
            <span className="text-[9px] text-txt-faint">{aiSignal.timeAgo}</span>
          </div>
        </div>
      )}
    </div>
  );
}
