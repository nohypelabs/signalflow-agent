import { z } from "zod";
import {
  limitSchema,
  nonNegativeNumericString,
  positiveNumericString,
  symbolSchema,
} from "./index";

export const orderCreationSchema = z
  .object({
    symbol: symbolSchema,
    side: z.enum(["BUY", "SELL"]),
    type: z.enum(["MARKET"]),
    quantity: positiveNumericString,
    price: positiveNumericString.optional(),
    signature: z.string().min(1).max(1_000).optional(),
    userAddress: z.string().min(1).max(120).optional(),
    clientOrderId: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const signalGenerationSchema = z
  .object({
    coin: z.string().trim().min(1).max(20).optional(),
    pair: z.string().trim().min(1).max(40).optional(),
    provider: z.enum(["openai", "deepseek", "openrouter", "gemini", "google"]).optional(),
    model: z.string().trim().min(1).max(120).optional(),
    apiKey: z.string().min(1).max(2_000).optional(),
    includeAI: z.boolean().optional(),
  })
  .strict();

export const marketTypeSchema = z.object({
  type: z.enum(["tickers", "klines", "symbols", "orderbook", "trades"]),
});

const optionalSymbolQuery = z.object({
  symbol: symbolSchema.optional(),
});

export const marketTickersQuerySchema = optionalSymbolQuery;
export const marketSymbolsQuerySchema = optionalSymbolQuery;

export const marketKlinesQuerySchema = z.object({
  symbol: symbolSchema,
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]).default("1h"),
  limit: limitSchema.optional(),
});

export const marketOrderbookQuerySchema = z.object({
  symbol: symbolSchema,
  limit: limitSchema.max(500).optional(),
});

export const marketTradesQuerySchema = z.object({
  symbol: symbolSchema,
  limit: limitSchema.max(500).optional(),
});

export const correlationQuerySchema = z.object({
  symbols: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value.split(",").map((symbol) => symbol.trim()).filter(Boolean)
        : ["vBTC_vUSDC", "vETH_vUSDC", "vSOL_vUSDC", "vBNB_vUSDC", "vXRP_vUSDC", "vDOGE_vUSDC"],
    )
    .pipe(z.array(symbolSchema).min(2).max(12)),
  limit: limitSchema.min(3).max(500).default(30),
  timeframe: z.enum(["1h", "1d"]).default("1d"),
});

export const screenerQuerySchema = z.object({
  category: z.enum(["all", "index", "stock", "commodity", "utility", "crypto"]).default("all"),
  minVolume: nonNegativeNumericString.optional(),
  status: z.string().trim().min(1).max(40).optional(),
  sortBy: z.enum(["volume", "change", "marketcap", "price"]).default("volume"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
