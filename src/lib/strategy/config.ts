export const STRATEGY_CONFIG_STORAGE_KEY = "signalflow-strategy-config";
export const STRATEGY_CONFIG_EVENT = "signalflow-strategy-config-changed";

export type StrategyEngineName = "confluence" | "liquidityFlow";

// Re-export for consumers (weights driven by injected Thinking Framework)
export type { TradingTypeProfile, TradingTypeProfiles, FactorWeights, FrameworkApplication, FrameworkTraceEntry } from "./thinking-framework";
import type { TradingTypeProfiles } from "./thinking-framework";

export interface StrategyConfig {
  engine: StrategyEngineName;
  etfFlow: number;
  sentiment: number;
  macro: number;
  momentum: number;
  treasury: number;
  minConfidence: number;
  maxPositionSize: number;
  autoExecute: boolean;
  slippage: number;
  maxDailyTrades: number;
  // Custom trading type weight profiles (Thinking Framework overrides)
  // When present, signal engine uses these instead of static TRADING_TYPES weights for that type.
  typeProfiles?: TradingTypeProfiles;
}

export interface ActiveStrategySummary {
  engine: StrategyEngineName;
  label: string;
  minConfidence: number;
  maxPositionSize: number;
  autoExecute: boolean;
  slippage: number;
  maxDailyTrades: number;
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  engine: "confluence",
  etfFlow: 30,
  sentiment: 25,
  macro: 20,
  momentum: 15,
  treasury: 10,
  minConfidence: 52, // v3: lower default so system makes frequent decisions in 24/7 volatile crypto. Raise if you want fewer but higher-conviction. All signals carry full factors[] for post-trade audit of wins/losses.
  maxPositionSize: 5,
  autoExecute: true,
  slippage: 0.5,
  maxDailyTrades: 10,
  typeProfiles: undefined,
};

export const LIQUIDITY_FLOW_STRATEGY_CONFIG: StrategyConfig = {
  ...DEFAULT_STRATEGY_CONFIG,
  engine: "liquidityFlow",
  etfFlow: 0,
  sentiment: 0,
  macro: 0,
  momentum: 100,
  treasury: 0,
  minConfidence: 72,
  maxPositionSize: 0.5,
  autoExecute: false,
  slippage: 0.03,
  maxDailyTrades: 8,
  typeProfiles: undefined,
};

export type StrategyPresetName = "conservative" | "balanced" | "aggressive";

export const PRESETS: Record<StrategyPresetName, StrategyConfig> = {
  conservative: { ...DEFAULT_STRATEGY_CONFIG, etfFlow: 35, sentiment: 15, macro: 25, momentum: 10, treasury: 15, minConfidence: 80, maxPositionSize: 3, autoExecute: false, slippage: 0.3, maxDailyTrades: 5 },
  balanced: { ...DEFAULT_STRATEGY_CONFIG, etfFlow: 30, sentiment: 25, macro: 20, momentum: 15, treasury: 10, minConfidence: 62, maxPositionSize: 5, autoExecute: true, slippage: 0.5, maxDailyTrades: 10 },
  aggressive: { ...DEFAULT_STRATEGY_CONFIG, etfFlow: 20, sentiment: 30, macro: 10, momentum: 30, treasury: 10, minConfidence: 55, maxPositionSize: 10, autoExecute: true, slippage: 1.0, maxDailyTrades: 25 },
};

export const PRESET_META: Record<StrategyPresetName, { label: string; badge: string; desc: string; tone: string; bullets: string[] }> = {
  conservative: {
    label: "Conservative",
    badge: "Low Risk",
    desc: "High-confidence signals, smaller position size, manual execution bias. Engine still produces candidates; this preset just filters harder at the policy gate.",
    tone: "border-info/30 bg-info/5 text-info",
    bullets: ["80% min confidence", "3% max position", "5 trades per day"],
  },
  balanced: {
    label: "Balanced",
    badge: "Default",
    desc: "Middle-ground signal scoring for steady validation and controlled execution. Engine is tuned to emit more real signals (WEAK_LONG etc).",
    tone: "border-accent/30 bg-accent/5 text-accent",
    bullets: ["58% min confidence (tunable)", "5% max position", "10 trades per day"],
  },
  aggressive: {
    label: "Aggressive",
    badge: "High Activity",
    desc: "More momentum weight, lower confidence threshold, higher paper-trade cadence. Best for seeing lots of signals.",
    tone: "border-hold/30 bg-hold/5 text-hold",
    bullets: ["55% min confidence", "10% max position", "25 trades per day"],
  },
};

export const PRESET_ORDER: StrategyPresetName[] = ["conservative", "balanced", "aggressive"];

export function getPresetName(config: StrategyConfig): StrategyPresetName | null {
  for (const name of PRESET_ORDER) {
    const preset = PRESETS[name];
    const matches = (Object.keys(preset) as (keyof StrategyConfig)[]).every((key) => preset[key] === config[key]);
    if (matches) return name;
  }
  return null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeStrategyConfig(value: unknown): StrategyConfig {
  const input = value && typeof value === "object"
    ? value as Partial<Record<keyof StrategyConfig, unknown>>
    : {};
  const engine = input.engine === "liquidityFlow" ? "liquidityFlow" : "confluence";
  const base = engine === "liquidityFlow"
    ? LIQUIDITY_FLOW_STRATEGY_CONFIG
    : DEFAULT_STRATEGY_CONFIG;

  // Pass-through custom type profiles (Thinking Framework). Shallow validation only.
  const rawProfiles = (input as any).typeProfiles;
  let typeProfiles: import("./thinking-framework").TradingTypeProfiles | undefined;
  if (rawProfiles && typeof rawProfiles === "object") {
    typeProfiles = {};
    const validTypes = ["scalping", "intraday", "swing", "position"] as const;
    for (const t of validTypes) {
      const p = (rawProfiles as any)[t];
      if (p && p.weights && typeof p.weights === "object") {
        const w = p.weights;
        typeProfiles[t] = {
          weights: {
            trend: clamp(finiteNumber(w.trend, 15), 0, 60),
            momentum: clamp(finiteNumber(w.momentum, 20), 0, 60),
            volatility: clamp(finiteNumber(w.volatility, 10), 0, 60),
            volume: clamp(finiteNumber(w.volume, 10), 0, 60),
            structure: clamp(finiteNumber(w.structure, 10), 0, 60),
          },
        };
      }
    }
    // Drop if empty after filter
    if (Object.keys(typeProfiles).length === 0) typeProfiles = undefined;
  }

  return {
    engine,
    etfFlow: clamp(finiteNumber(input.etfFlow, base.etfFlow), 0, 100),
    sentiment: clamp(finiteNumber(input.sentiment, base.sentiment), 0, 100),
    macro: clamp(finiteNumber(input.macro, base.macro), 0, 100),
    momentum: clamp(finiteNumber(input.momentum, base.momentum), 0, 100),
    treasury: clamp(finiteNumber(input.treasury, base.treasury), 0, 100),
    minConfidence: clamp(finiteNumber(input.minConfidence, base.minConfidence), 20, 98),
    maxPositionSize: clamp(finiteNumber(input.maxPositionSize, base.maxPositionSize), 0.1, 20),
    autoExecute: typeof input.autoExecute === "boolean" ? input.autoExecute : base.autoExecute,
    slippage: clamp(finiteNumber(input.slippage, base.slippage), 0.01, 5),
    maxDailyTrades: Math.round(clamp(finiteNumber(input.maxDailyTrades, base.maxDailyTrades), 1, 50)),
    typeProfiles,
  };
}

export function loadStrategyConfig(): StrategyConfig {
  if (typeof window === "undefined") return DEFAULT_STRATEGY_CONFIG;
  try {
    const saved = localStorage.getItem(STRATEGY_CONFIG_STORAGE_KEY);
    return saved ? sanitizeStrategyConfig(JSON.parse(saved)) : DEFAULT_STRATEGY_CONFIG;
  } catch {
    return DEFAULT_STRATEGY_CONFIG;
  }
}

export function saveStrategyConfig(config: StrategyConfig): StrategyConfig {
  const sanitized = sanitizeStrategyConfig(config);
  if (typeof window === "undefined") return sanitized;
  try {
    localStorage.setItem(STRATEGY_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(STRATEGY_CONFIG_EVENT, { detail: sanitized }));
  } catch {
    // Keep the in-memory UI usable when storage is blocked.
  }
  return sanitized;
}

export function serializeStrategyConfig(config: StrategyConfig): string {
  return JSON.stringify(sanitizeStrategyConfig(config));
}

export function deserializeStrategyConfig(raw: string | null): StrategyConfig {
  if (!raw) return DEFAULT_STRATEGY_CONFIG;
  try {
    return sanitizeStrategyConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_STRATEGY_CONFIG;
  }
}

export function strategyConfigKey(config: StrategyConfig): string {
  return serializeStrategyConfig(config);
}

// Re-export the Thinking Framework runner so StrategyConfig can execute ("jalankan") the agent's structured reasoning layer.
export {
  applyThinkingFramework,
  getFrameworkDefaults,
  getEffectiveWeights,
  THINKING_FRAMEWORK_PRINCIPLES,
} from "./thinking-framework";

export function toActiveStrategySummary(config: StrategyConfig): ActiveStrategySummary {
  const sanitized = sanitizeStrategyConfig(config);
  return {
    engine: sanitized.engine,
    label: sanitized.engine === "liquidityFlow" ? "Liquidity Flow" : "Confluence V2",
    minConfidence: sanitized.minConfidence,
    maxPositionSize: sanitized.maxPositionSize,
    autoExecute: sanitized.autoExecute,
    slippage: sanitized.slippage,
    maxDailyTrades: sanitized.maxDailyTrades,
  };
}
