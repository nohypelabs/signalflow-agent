/**
 * Zod validation schemas for all V1 API query parameters.
 */

import { z } from "zod";

// ─── Common ───

const TRADING_TYPES = ["scalping", "intraday", "swing", "position"] as const;
const PAIRS = ["BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC", "LINK/USDC"] as const;

export type IncludeModule =
  | "signals"
  | "market"
  | "orderbook"
  | "etf"
  | "macro"
  | "news"
  | "performance"
  | "regime"
  | "funding"
  | "correlation"
  | "screener"
  | "backtest";

const ALL_INCLUDE_MODULES: IncludeModule[] = [
  "signals", "market", "orderbook", "etf", "macro",
  "news", "performance", "regime", "funding", "correlation",
  "screener", "backtest",
];

const DEFAULT_INCLUDES: IncludeModule[] = ["signals", "market"];

// ─── System Data ───

export const systemDataQuerySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return DEFAULT_INCLUDES;
      return val.split(",").filter((m): m is IncludeModule =>
        ALL_INCLUDE_MODULES.includes(m as IncludeModule),
      );
    }),
});

// ─── Signals ───

export const signalsQuerySchema = z.object({
  type: z.enum(TRADING_TYPES).optional(),
  strategy: z.enum(["confluence", "liquidityFlow"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Signals Analyze ───

export const signalsAnalyzeBodySchema = z.object({
  coin: z.string().min(1).max(20),
  provider: z.enum(["deepseek", "openai", "openrouter"]).optional(),
  model: z.string().max(100).optional(),
  apiKey: z.string().max(200).optional(),
  strategy: z.enum(["confluence", "liquidityFlow"]).optional(),
});

// ─── Market Tickers ───

export const marketTickersQuerySchema = z.object({
  symbol: z.string().max(50).optional(),
});

// ─── Market Klines ───

export const marketKlinesQuerySchema = z.object({
  symbol: z.string().min(1).max(50),
  interval: z.string().max(10).default("1h"),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

// ─── Market Orderbook ───

export const marketOrderbookQuerySchema = z.object({
  symbol: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── ETF Flow ───

export const etfFlowQuerySchema = z.object({
  symbol: z.string().max(20).optional(),
  country: z.string().max(10).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

// ─── Macro ───

export const macroQuerySchema = z.object({
  history: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  event: z.string().max(100).optional(),
});

// ─── News ───

export const newsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// ─── Performance ───

export const performanceQuerySchema = z.object({
  // No params needed currently
});

// ─── Correlation ───

export const correlationQuerySchema = z.object({
  symbols: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(10).max(500).default(100),
  timeframe: z.string().max(10).default("1h"),
});

// ─── Screener ───

export const screenerQuerySchema = z.object({
  category: z.string().max(50).optional(),
  minVolume: z.coerce.number().min(0).optional(),
  status: z.string().max(20).optional(),
  sortBy: z.string().max(30).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

// ─── Funding ───

export const fundingQuerySchema = z.object({
  symbol: z.string().max(50).optional(),
});

// ─── Backtest ───

export const backtestQuerySchema = z.object({
  pair: z.enum(PAIRS).default("BTC/USDC"),
  type: z.enum(TRADING_TYPES).optional(),
  resolution: z.coerce.number().int().min(4).max(48).default(12),
  step: z.coerce.number().int().min(1).max(24).default(4),
});

// ─── API Key Management ───

export const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, "Name must be alphanumeric with dashes/underscores"),
});

// ─── Auth ───

export const authVerifyBodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});
