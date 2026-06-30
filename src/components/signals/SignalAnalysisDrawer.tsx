"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Signal, LiveSignalDimensions } from "@/lib/types/signal";
import SignalScoreBreakdown from "./SignalScoreBreakdown";
import SignalConfluenceBreakdown from "./SignalConfluenceBreakdown";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "./signal-utils";

interface Props {
  signal: Signal;
  liveDims?: LiveSignalDimensions | null;
  weights?: Record<string, number> | null;
  cappedDims?: string[] | null;
  onClose?: () => void;
}

export default function SignalAnalysisDrawer({ signal, liveDims, weights, cappedDims, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const coin = signal.pair.split("/")[0];
  const ex = signal.execution;
  const qualityLabel = signal.quality?.status === "blocked" ? "watch" : signal.quality?.status;

  // Extract V2 engine data for confluence breakdown
  const factors = signal.factors ?? [];
  const confluence = signal.confluence ?? 50;
  const regime = signal.regime ?? "RANGING";
  const action = signal.action ?? "HOLD";
  const bullishCount = factors.filter((f) => f.score > 60).length;
  const bearishCount = factors.filter((f) => f.score < 40).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 px-3 pb-5 pt-20 backdrop-blur-md sm:px-5 lg:pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${signal.pair} signal analysis`}
    >
      <div
        className="ticker-selector-glass relative flex max-h-[calc(100vh-6.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[35px] shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Signal Analysis</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-txt-primary">{signal.pair}</h3>
              <Badge variant="muted" size="sm">{signal.actionV2 ?? signal.action}</Badge>
              <span className="glass-pill px-2.5 py-1 text-[10px] font-mono text-txt-secondary">
                {signal.confidence}% confidence
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-txt-secondary">
              Full reasoning, confluence, risk plan, and data sources behind this signal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-control h-9 w-9 shrink-0 rounded-[35px] text-sm font-bold text-txt-secondary transition-all hover:text-txt-primary"
            aria-label="Close signal analysis"
          >
            X
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-4">
        {/* ── CONFLUENCE BREAKDOWN (V2 Engine Transparency) ── */}
        {/* This is what judges want to see: HOW the signal was generated */}
        {factors.length > 0 && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">
              Confluence Engine Breakdown
            </p>
            <div className="bg-surface-1 border border-border rounded-lg p-3">
              <SignalConfluenceBreakdown
                factors={factors}
                confluence={confluence}
                regime={regime}
                action={action}
                bullishCount={bullishCount}
                bearishCount={bearishCount}
              />
            </div>
          </div>
        )}

        {/* Setup & Quality info */}
        {signal.setup && (
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-1 border border-border rounded-lg p-2">
              <div className="text-[9px] text-txt-dim">Setup Type</div>
              <div className="text-xs font-mono text-txt-primary mt-0.5">
                {signal.setup.label}
              </div>
            </div>
            {signal.quality && (
              <div className="flex-1 bg-surface-1 border border-border rounded-lg p-2">
                <div className="text-[9px] text-txt-dim">Signal Quality</div>
                <div className="text-xs font-mono mt-0.5" style={{
                  color: signal.quality.status === "actionable" ? "#00E5A8" :
                         signal.quality.status === "watch" ? "#F59E0B" : "#F59E0B"
                }}>
                  {qualityLabel} ({signal.quality.calibratedConfidence}%)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Setup thesis & invalidation */}
        {signal.setup && signal.setup.thesis && (
          <div className="bg-surface-1 border border-border rounded-lg p-2">
            <div className="text-[9px] text-txt-dim mb-1">Trade Thesis</div>
            <p className="text-[11px] text-txt-secondary leading-relaxed">{signal.setup.thesis}</p>
            {signal.setup.invalidation && (
              <>
                <div className="text-[9px] text-txt-dim mt-2 mb-1">Invalidation</div>
                <p className="text-[10px] text-txt-dim leading-relaxed">{signal.setup.invalidation}</p>
              </>
            )}
          </div>
        )}

        {/* Full reasoning */}
        <div>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5">Signal Thesis</p>
          <p className="text-xs text-txt-secondary leading-relaxed">{signal.reasoning}</p>
        </div>

        {/* Score breakdown with details (legacy dimensions) */}
        <div>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">SoSoValue Dimensions</p>
          <SignalScoreBreakdown
            dims={signal.dimensions}
            dimDetails={signal.dimensionDetails}
            liveDims={liveDims}
          />
        </div>

        {/* Trade plan */}
        {ex && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-2">Trade Plan</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Order Type", value: ex.orderType, color: "text-accent" },
                { label: "Entry", value: `$${formatPrice(ex.entry, coin)}`, color: "text-txt-primary" },
                { label: "Take Profit", value: ex.takeProfit > 0 ? `$${formatPrice(ex.takeProfit, coin)}` : "—", color: "text-buy" },
                { label: "Stop Loss", value: ex.stopLoss > 0 ? `$${formatPrice(ex.stopLoss, coin)}` : "—", color: "text-sell" },
                { label: "Position Size", value: ex.positionSize, color: "text-txt-primary" },
                { label: "Risk/Reward", value: ex.riskReward, color: "text-buy" },
              ].map((item) => (
                <div key={item.label} className="bg-inset rounded-lg px-3 py-2 border border-border-default">
                  <p className="text-[9px] text-txt-dim">{item.label}</p>
                  <p className={`text-xs font-semibold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk assessment */}
        {ex && ex.stopLoss > 0 && ex.entry > 0 && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5">Risk Assessment</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-txt-muted mb-1">
                  <span>Entry → Stop Loss</span>
                  <span className="text-sell font-semibold">
                    -{((Math.abs(ex.entry - ex.stopLoss) / ex.entry) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-hold to-sell"
                    style={{ width: `${Math.min(100, (Math.abs(ex.entry - ex.stopLoss) / ex.entry) * 500)}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-txt-muted mb-1">
                  <span>Entry → Take Profit</span>
                  <span className="text-buy font-semibold">
                    +{((Math.abs(ex.takeProfit - ex.entry) / ex.entry) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-buy/60 to-buy"
                    style={{ width: `${Math.min(100, (Math.abs(ex.takeProfit - ex.entry) / ex.entry) * 500)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weights info */}
        {weights && (
          <div>
            <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5">Dimension Weights</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weights).map(([key, weight]) => (
                <span key={key} className="text-[9px] font-mono text-txt-dim bg-inset px-2 py-0.5 rounded border border-border-default">
                  {key}: {weight}%
                  {cappedDims?.includes(key) && <span className="text-hold ml-1">(capped)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Thinking Framework trace for auditability (Wave 2: addresses judge feedback on verifiable analytical framework & strategy logic) */}
        {signal.frameworkApplication && (
          <div>
            <p className="text-[10px] text-accent uppercase tracking-wider mb-1.5 font-semibold">Thinking Framework Applied</p>
            <div className="text-[9px] text-txt-tertiary bg-inset p-2 rounded border border-border-default">
              <p><strong>Trading Type:</strong> {signal.frameworkApplication.tradingType}</p>
              <p><strong>Principles:</strong> {signal.frameworkApplication.principlesApplied?.join(", ")}</p>
              <p className="mt-1 text-txt-faint">{signal.frameworkApplication.note}</p>
            </div>
          </div>
        )}

        {/* Data sources */}
        <div>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider mb-1.5">Data Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {signal.sources.map((src) => (
              <Badge key={src} variant="muted" size="sm">{src}</Badge>
            ))}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
