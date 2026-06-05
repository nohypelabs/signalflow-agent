/**
 * Tier configuration — single source of truth for all subscription limits.
 * Referenced by middleware, usage tracker, cache, and response builder.
 */

import type { ApiEndpoint } from "@prisma/client";
import type { SubscriptionTier, TierConfig } from "@/lib/api-auth/context";

const FREE_ENDPOINTS: ReadonlySet<ApiEndpoint> = new Set([
  "SIGNALS",
  "MARKET_TICKERS",
  "MARKET_KLINES",
  "ETF_FLOW",
  "MACRO",
  "NEWS",
  "PERFORMANCE",
  "FUNDING",
  "SYSTEM_DATA",
] as ApiEndpoint[]);

const PRO_ENDPOINTS: ReadonlySet<ApiEndpoint> = new Set([
  "SIGNALS",
  "SIGNALS_ANALYZE",
  "MARKET_TICKERS",
  "MARKET_KLINES",
  "MARKET_ORDERBOOK",
  "ETF_FLOW",
  "MACRO",
  "NEWS",
  "PERFORMANCE",
  "CORRELATION",
  "SCREENER",
  "FUNDING",
  "SYSTEM_DATA",
] as ApiEndpoint[]);

const ALL_ENDPOINTS: ReadonlySet<ApiEndpoint> = new Set([
  "SYSTEM_DATA",
  "SIGNALS",
  "SIGNALS_ANALYZE",
  "MARKET_TICKERS",
  "MARKET_KLINES",
  "MARKET_ORDERBOOK",
  "ETF_FLOW",
  "MACRO",
  "NEWS",
  "PERFORMANCE",
  "CORRELATION",
  "SCREENER",
  "FUNDING",
  "BACKTEST",
] as ApiEndpoint[]);

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  FREE: {
    requestsPerDay: 100,
    rateLimitPerMin: 10,
    cacheTtlSeconds: 900, // 15 min — serves stale data as the "delay" mechanism
    dataFreshness: "delayed_15m",
    maxSignals: 5,
    allowedEndpoints: FREE_ENDPOINTS,
    canAnalyze: false,
    canBacktest: false,
    maxApiKeys: 1,
  },
  PRO: {
    requestsPerDay: 5_000,
    rateLimitPerMin: 60,
    cacheTtlSeconds: 60,
    dataFreshness: "realtime",
    maxSignals: Infinity,
    allowedEndpoints: PRO_ENDPOINTS,
    canAnalyze: true,
    canBacktest: false,
    maxApiKeys: 5,
  },
  WHALE: {
    requestsPerDay: Infinity,
    rateLimitPerMin: 120,
    cacheTtlSeconds: 30,
    dataFreshness: "realtime",
    maxSignals: Infinity,
    allowedEndpoints: ALL_ENDPOINTS,
    canAnalyze: true,
    canBacktest: true,
    maxApiKeys: 20,
  },
} as const;

/** Check if an endpoint is accessible for a given tier. */
export function isEndpointAllowed(
  tier: SubscriptionTier,
  endpoint: ApiEndpoint,
): boolean {
  return TIER_CONFIGS[tier].allowedEndpoints.has(endpoint);
}
