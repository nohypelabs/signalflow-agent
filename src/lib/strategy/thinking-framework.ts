import type { TradingType } from "../types/trading-type";
import type { MarketRegime } from "./signal-engine-v2/types";
import { TRADING_TYPES } from "../types/trading-type";

export type FactorKey = "trend" | "momentum" | "volatility" | "volume" | "structure";

export type FactorWeights = Record<FactorKey, number>;

export interface TradingTypeProfile {
  weights: FactorWeights;
}

export type TradingTypeProfiles = Partial<Record<TradingType, TradingTypeProfile>>;

// ─────────────────────────────────────────────────────────────
// SIGNALFLOW AGENT — THINKING FRAMEWORK
// (Also referred to internally as "Kerangka Berfikir")
//
// Structured, explicit reasoning layer for adaptive multi-horizon trading profiles.
//
// This module injects a first-class "mental model" into the strategy configuration
// system. It encodes 5 auditable principles that determine *why* and *how* the
// 5-factor weights (Trend / Momentum / Volatility / Volume / Structure) should
// be allocated differently for Scalper, Intraday, Swing, and Position styles.
//
// The /strategy-config page exposes "Apply Thinking Framework" — the runtime
// execution of this model. It can adapt profiles based on detected MarketRegime
// or reset them to the principled baseline.
//
// Purpose: Replace opaque / static weight tuning with a transparent,
// judge-auditable reasoning system. This directly contributes to making
// SignalFlow a more agentic system rather than a rules dashboard.
// Built for SoSoValue Buildathon 2026 Wave 2.
// ─────────────────────────────────────────────────────────────

export interface ThinkingPrinciple {
  id: string;
  title: string;
  description: string;
  rationale: string; // The explicit reasoning step
}

export const THINKING_FRAMEWORK_PRINCIPLES: ThinkingPrinciple[] = [
  {
    id: "horizon_alignment",
    title: "Horizon Alignment",
    description: "Match factor dominance to the decision horizon. Scalping operates in micro-noise where momentum and volatility dominate. Position trading operates in macro-regimes where trend and structure provide the durable edge.",
    rationale: "Short horizons render higher-timeframe structure unreliable. Long horizons make short-term momentum noisy and mean-reverting. Factor weights must be calibrated to the statistically reliable signals at each timeframe.",
  },
  {
    id: "regime_modulation",
    title: "Regime-Conditional Modulation",
    description: "In strong directional regimes (TRENDING_UP / TRENDING_DOWN / BREAKOUT), increase the weight of the regime-confirming factor (primarily TREND, secondarily MOMENTUM) across all styles. In RANGING or VOLATILE regimes, elevate STRUCTURE and VOLATILITY to respect mean-reversion boundaries and avoid trend-chasing whipsaws.",
    rationale: "A clear trend regime increases the expected value of trend-following for all participants. Choppy regimes punish pure trend bias; support/resistance and volatility context become the actual sources of edge.",
  },
  {
    id: "diversification_floor",
    title: "Diversification & Confluence Floor",
    description: "No individual factor may exceed ~45% in any profile. Every profile must maintain at least two factors with material weight (>15%) so that signals are genuinely multi-factor.",
    rationale: "Over-reliance on a single factor produces brittle, non-confluent signals. The core thesis of the SignalFlow V2 engine is confluence; profiles that degenerate into single-factor bets undermine the entire architecture.",
  },
  {
    id: "volatility_as_context",
    title: "Volatility as Risk Context, Not Primary Signal",
    description: "Assign higher volatility weight to short-horizon styles (Scalper / Intraday) because volatility directly determines tradable range and liquidation distance. Assign low volatility weight to Swing / Position styles where volatility is secondary to the larger directional thesis.",
    rationale: "For high-frequency styles, volatility is both opportunity and existential risk. For multi-day or multi-week styles, volatility is mostly noise around the primary trend or structure thesis.",
  },
  {
    id: "volume_as_confirmation",
    title: "Volume as Confirmation, Never Primary Driver",
    description: "Volume weight is deliberately capped in the 10–20% range across all profiles. Volume is used only to confirm or refute the primary thesis factor(s). It is never the highest-weighted factor.",
    rationale: "Volume spikes without corresponding price conviction are frequently news-driven noise or low-conviction rotation. Volume validates directional or structural theses; it rarely originates them.",
  },
];

export const FRAMEWORK_DEFAULT_WEIGHTS: Record<TradingType, FactorWeights> = {
  scalping: { trend: 10, momentum: 40, volatility: 25, volume: 20, structure: 5 },
  intraday: { trend: 25, momentum: 30, volatility: 20, volume: 15, structure: 10 },
  swing:    { trend: 35, momentum: 20, volatility: 10, volume: 10, structure: 25 },
  position: { trend: 45, momentum: 10, volatility: 5,  volume: 10, structure: 30 },
};

// Returns the canonical principled defaults (wrapped as profiles).
// These are the "framework-native" weights before any runtime regime modulation.
export function getFrameworkDefaults(): TradingTypeProfiles {
  const out: TradingTypeProfiles = {};
  (Object.keys(FRAMEWORK_DEFAULT_WEIGHTS) as TradingType[]).forEach((t) => {
    out[t] = { weights: { ...FRAMEWORK_DEFAULT_WEIGHTS[t] } };
  });
  return out;
}

// Executes the Thinking Framework against the current (or default) profiles.
// - Applies regime-conditional modulation when a MarketRegime is supplied.
// - Enforces diversification floor and horizon constraints.
// - Re-normalizes weights to ~100.
// This is the "Apply Thinking Framework" operation exposed in StrategyConfig.
export interface FrameworkTraceEntry {
  type: TradingType;
  principlesApplied: string[];
  changes: Array<{ factor: FactorKey; before: number; after: number; reason: string }>;
}

export interface FrameworkApplication {
  profiles: TradingTypeProfiles;
  trace: FrameworkTraceEntry[];
  regime?: MarketRegime;
  note: string;
}

export function applyThinkingFramework(
  inputProfiles: TradingTypeProfiles,
  context?: { regime?: MarketRegime }
): FrameworkApplication {
  const regime = context?.regime;
  const result: TradingTypeProfiles = {};
  const trace: FrameworkTraceEntry[] = [];

  for (const type of (["scalping", "intraday", "swing", "position"] as TradingType[])) {
    // Start from input if present, else framework default
    const base = inputProfiles[type]?.weights ?? FRAMEWORK_DEFAULT_WEIGHTS[type];
    const w = { ...base };
    const changes: FrameworkTraceEntry["changes"] = [];
    const principlesForType: string[] = [];

    // ── Regime Modulation (Principle 2) ──
    if (regime === "TRENDING_UP" || regime === "TRENDING_DOWN" || regime === "BREAKOUT") {
      const trendBoost = type === "scalping" ? 8 : type === "intraday" ? 10 : 12;
      const newTrend = Math.min(55, w.trend + trendBoost);
      if (newTrend !== w.trend) {
        changes.push({ factor: "trend", before: w.trend, after: newTrend, reason: `Regime ${regime}: boosted per Regime-Conditional Modulation principle` });
        w.trend = newTrend;
      }
      const newMom = Math.max(5, w.momentum - Math.floor(trendBoost * 0.5));
      if (newMom !== w.momentum) {
        changes.push({ factor: "momentum", before: w.momentum, after: newMom, reason: "Reduced to emphasize trend in clear regime (avoids mean-reversion noise)" });
        w.momentum = newMom;
      }
      principlesForType.push("Regime-Conditional Modulation");
    } else if (regime === "RANGING" || regime === "VOLATILE") {
      const structBoost = (type === "swing" || type === "position" ? 8 : 6);
      const newStruct = Math.min(40, w.structure + structBoost);
      if (newStruct !== w.structure) {
        changes.push({ factor: "structure", before: w.structure, after: newStruct, reason: `Regime ${regime}: elevated for mean-reversion boundaries per Regime-Conditional Modulation` });
        w.structure = newStruct;
      }
      const volBoost = (type === "scalping" || type === "intraday" ? 6 : 3);
      const newVol = Math.min(32, w.volatility + volBoost);
      if (newVol !== w.volatility) {
        changes.push({ factor: "volatility", before: w.volatility, after: newVol, reason: "Increased for range/volatility awareness in choppy conditions" });
        w.volatility = newVol;
      }
      if (type === "swing" || type === "position") {
        const newTrend = Math.max(18, w.trend - 7);
        if (newTrend !== w.trend) {
          changes.push({ factor: "trend", before: w.trend, after: newTrend, reason: "Reduced blind trend bias in ranging/volative regime" });
          w.trend = newTrend;
        }
      }
      principlesForType.push("Regime-Conditional Modulation");
    }

    // ── Diversification Floor (Principle 3) + caps ──
    (Object.keys(w) as FactorKey[]).forEach((k) => {
      if (w[k] > 45) {
        const beforeVal = w[k];
        w[k] = 45;
        changes.push({ factor: k, before: beforeVal, after: 45, reason: "Capped at 45% per Diversification & Confluence Floor (prevents single-factor dominance, addresses outlier stabilization)" });
      }
    });

    const sorted = (Object.entries(w) as [FactorKey, number][]).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] > 40 && sorted[1][1] < 15) {
      const excess = sorted[0][1] - 38;
      const oldHigh = w[sorted[0][0]];
      w[sorted[0][0]] = 38;
      changes.push({ factor: sorted[0][0], before: oldHigh, after: 38, reason: "Capped dominant factor for diversification (ties to outlier handling in legacy dynamic weights)" });
      const oldLow = w[sorted[1][0]];
      w[sorted[1][0]] = Math.min(25, oldLow + Math.floor(excess / 2));
      changes.push({ factor: sorted[1][0], before: oldLow, after: w[sorted[1][0]], reason: "Redistributed to secondary factor for balanced confluence" });
    }

    // Re-normalize ...
    const sum = (Object.values(w) as number[]).reduce((s, v) => s + v, 0);
    if (sum !== 100 && sum > 0) {
      const scale = 100 / sum;
      (Object.keys(w) as FactorKey[]).forEach((k) => {
        const old = w[k];
        w[k] = Math.round(w[k] * scale);
        if (w[k] !== old) {
          changes.push({ factor: k, before: old, after: w[k], reason: "Re-normalized to ~100% after principle adjustments" });
        }
      });
      const newSum = (Object.values(w) as number[]).reduce((s, v) => s + v, 0);
      if (newSum !== 100) {
        const oldMom = w.momentum;
        w.momentum += (100 - newSum);
        changes.push({ factor: "momentum", before: oldMom, after: w.momentum, reason: "Residual adjustment to reach exact 100% (momentum as flexible factor)" });
      }
    }

    // Final safety clamps...
    if (type === "scalping") {
      const oldMom = w.momentum;
      w.momentum = Math.max(30, Math.min(48, w.momentum));
      if (w.momentum !== oldMom) changes.push({ factor: "momentum", before: oldMom, after: w.momentum, reason: "Horizon Alignment clamp for scalping (momentum dominant but capped)" });
      const oldStr = w.structure;
      w.structure = Math.min(10, w.structure);
      if (w.structure !== oldStr) changes.push({ factor: "structure", before: oldStr, after: w.structure, reason: "Horizon clamp: structure low for short timeframes" });
    }
    if (type === "position") {
      const oldTrend = w.trend;
      w.trend = Math.max(35, w.trend);
      if (w.trend !== oldTrend) changes.push({ factor: "trend", before: oldTrend, after: w.trend, reason: "Horizon Alignment: trend must dominate for long horizons" });
      const oldVol = w.volatility;
      w.volatility = Math.min(8, w.volatility);
      if (w.volatility !== oldVol) changes.push({ factor: "volatility", before: oldVol, after: w.volatility, reason: "Volatility as Context clamp for position style" });
    }

    result[type] = { weights: w };

    if (changes.length > 0 || principlesForType.length > 0) {
      trace.push({
        type,
        principlesApplied: [...new Set([...principlesForType, "Horizon Alignment", "Diversification & Confluence Floor", "Volatility as Risk Context", "Volume as Confirmation"])],
        changes,
      });
    }
  }

  const note = regime 
    ? `Framework executed with live regime ${regime}. Principles from Thinking Framework applied for adaptive, auditable weights (ties to outlier stabilization via caps).`
    : "Framework executed using baseline principles. Provides explicit reasoning layer over static defaults.";

  return {
    profiles: result,
    trace,
    regime,
    note,
  };
}

// Returns the effective 5-factor weights for a given trading type.
// Priority: custom user-edited profiles from StrategyConfig > framework defaults.
export function getEffectiveWeights(
  type: TradingType,
  customProfiles?: TradingTypeProfiles
): FactorWeights {
  if (customProfiles && customProfiles[type]?.weights) {
    return { ...customProfiles[type]!.weights };
  }
  return { ...TRADING_TYPES[type].weights };
}
