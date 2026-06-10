"use client";

import type { MarketRegime, SignalActionV2 } from "@/lib/strategy/signal-engine-v2/types";

// Use the signal.ts ConfluenceFactor type (compatible with both)
interface ConfluenceFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
  bullish: boolean;
}

// ── Factor color mapping ──────────────────────────────────
const FACTOR_COLORS: Record<string, string> = {
  TREND: "#00E5A8",
  MOMENTUM: "#3B82F6",
  VOLATILITY: "#F59E0B",
  VOLUME: "#8B5CF6",
  STRUCTURE: "#EC4899",
  ORDER_FLOW: "#06B6D4",
  DEPTH: "#F97316",
  FUNDING: "#EF4444",
};

const REGIME_LABELS: Record<MarketRegime, { label: string; color: string; icon: string }> = {
  TRENDING_UP: { label: "Uptrend", color: "#00E5A8", icon: "↗" },
  TRENDING_DOWN: { label: "Downtrend", color: "#EF4444", icon: "↘" },
  RANGING: { label: "Ranging", color: "#F59E0B", icon: "↔" },
  VOLATILE: { label: "Volatile", color: "#F97316", icon: "⚡" },
  BREAKOUT: { label: "Breakout", color: "#8B5CF6", icon: "💥" },
};

const ACTION_COLORS: Record<SignalActionV2, string> = {
  STRONG_LONG: "#00E5A8",
  LONG: "#00E5A8",
  WEAK_LONG: "#4ADE80",
  HOLD: "#64748B",
  WEAK_SHORT: "#FCA5A5",
  SHORT: "#EF4444",
  STRONG_SHORT: "#DC2626",
};

// ── Helpers ────────────────────────────────────────────────

function scoreToBarWidth(score: number): string {
  return `${Math.max(0, Math.min(100, score))}%`;
}

function scoreToColor(score: number): string {
  if (score >= 65) return "#00E5A8";
  if (score >= 55) return "#4ADE80";
  if (score >= 45) return "#F59E0B";
  if (score >= 35) return "#F97316";
  return "#EF4444";
}

function biasLabel(score: number): string {
  if (score >= 65) return "Strong Bullish";
  if (score >= 55) return "Bullish";
  if (score >= 45) return "Neutral";
  if (score >= 35) return "Bearish";
  return "Strong Bearish";
}

// ── Props ──────────────────────────────────────────────────

interface Props {
  factors: ConfluenceFactor[];
  confluence: number;
  regime: MarketRegime;
  action: SignalActionV2;
  bullishCount: number;
  bearishCount: number;
  compact?: boolean;
}

// ── Component ──────────────────────────────────────────────

export default function SignalConfluenceBreakdown({
  factors,
  confluence,
  regime,
  action,
  bullishCount,
  bearishCount,
  compact = false,
}: Props) {
  const regimeInfo = REGIME_LABELS[regime];
  const actionColor = ACTION_COLORS[action];

  // Sort factors by deviation from neutral (most impactful first)
  const sortedFactors = [...factors].sort(
    (a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50),
  );

  // Conflict detection
  const strongBullish = factors.filter((f) => f.score > 65).length;
  const strongBearish = factors.filter((f) => f.score < 35).length;
  const hasConflict = strongBullish > 0 && strongBearish > 0;

  // Weighted contribution per factor
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {/* ── Header: Regime + Action + Confluence ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: regimeInfo.color + "20", color: regimeInfo.color }}
          >
            {regimeInfo.icon} {regimeInfo.label}
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded font-bold"
            style={{ background: actionColor + "20", color: actionColor }}
          >
            {action.replace("_", " ")}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold" style={{ color: scoreToColor(confluence) }}>
            {confluence}
          </div>
          <div className="text-[9px] text-txt-dim">CONFLUENCE</div>
        </div>
      </div>

      {/* ── Confluence bar ── */}
      <div className="relative h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{
            width: scoreToBarWidth(confluence),
            background: `linear-gradient(90deg, ${scoreToColor(40)}, ${scoreToColor(confluence)})`,
          }}
        />
        {/* Center line (50 = neutral) */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-txt-dim/30" />
      </div>

      {/* ── Factor breakdown ── */}
      <div className="flex flex-col gap-1">
        {sortedFactors.map((factor) => {
          const color = FACTOR_COLORS[factor.name] || "#64748B";
          const contribution = ((factor.score - 50) * factor.weight) / totalWeight;
          const isBullish = factor.score > 55;
          const isBearish = factor.score < 45;
          const isStrong = factor.score > 65 || factor.score < 35;

          return (
            <div key={factor.name} className="group">
              <div className="flex items-center gap-2">
                {/* Factor name */}
                <div className="w-20 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-mono text-txt-secondary truncate">
                    {factor.name}
                  </span>
                </div>

                {/* Score bar */}
                <div className="flex-1 relative h-3 bg-surface-2 rounded overflow-hidden">
                  {/* Neutral zone (45-55) */}
                  <div
                    className="absolute top-0 h-full bg-txt-dim/5"
                    style={{ left: "45%", width: "10%" }}
                  />
                  {/* Score fill */}
                  <div
                    className="absolute top-0 h-full rounded transition-all duration-300"
                    style={{
                      width: scoreToBarWidth(factor.score),
                      background: isStrong
                        ? color
                        : `linear-gradient(90deg, ${color}80, ${color})`,
                    }}
                  />
                  {/* Center marker */}
                  <div className="absolute left-1/2 top-0 w-px h-full bg-txt-dim/20" />
                </div>

                {/* Score value */}
                <div className="w-8 text-right">
                  <span
                    className="text-[11px] font-mono font-bold"
                    style={{ color: scoreToColor(factor.score) }}
                  >
                    {factor.score}
                  </span>
                </div>

                {/* Weight */}
                <div className="w-8 text-right">
                  <span className="text-[9px] font-mono text-txt-dim">
                    {Math.round(factor.weight * 100)}%
                  </span>
                </div>

                {/* Direction indicator */}
                <div className="w-6 text-center">
                  {isStrong && <span className="text-[10px]">●</span>}
                  {isBullish && !isStrong && <span className="text-[10px] text-green-400">▲</span>}
                  {isBearish && !isStrong && <span className="text-[10px] text-red-400">▼</span>}
                  {!isBullish && !isBearish && <span className="text-[10px] text-txt-dim">—</span>}
                </div>
              </div>

              {/* Factor detail (expandable on hover) */}
              {!compact && factor.detail && (
                <div className="ml-[5.5rem] mt-0.5">
                  <p className="text-[9px] text-txt-dim truncate" title={factor.detail}>
                    {factor.detail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Summary: Bullish vs Bearish count ── */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-3">
          <span className="text-green-400">
            ▲ {bullishCount} bullish
          </span>
          <span className="text-red-400">
            ▼ {bearishCount} bearish
          </span>
          {hasConflict && (
            <span className="text-yellow-400">
              ⚠ conflict detected
            </span>
          )}
        </div>
        <span className="text-txt-dim">
          {factors.length} factors active
        </span>
      </div>

      {/* ── Conflict warning ── */}
      {hasConflict && (
        <div className="text-[10px] text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded px-2 py-1">
          ⚠ Conflicting signals: {strongBullish} strong bullish vs {strongBearish} strong bearish factors.
          Signal classification requires agreement — conflicting factors reduce conviction.
        </div>
      )}
    </div>
  );
}
