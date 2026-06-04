export const STRATEGY_CONFIG_STORAGE_KEY = "signalflow-strategy-config";
export const STRATEGY_CONFIG_EVENT = "signalflow-strategy-config-changed";

export type StrategyEngineName = "confluence" | "liquidityFlow";

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
  minConfidence: 70,
  maxPositionSize: 5,
  autoExecute: true,
  slippage: 0.5,
  maxDailyTrades: 10,
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
};

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
