/**
 * Tier-aware response builder.
 * Filters data based on subscription tier before returning to the client.
 * Adds standardized meta envelope with quota and cache info.
 */

import type { ApiEndpoint } from "@prisma/client";
import type { AuthContext, SubscriptionTier } from "@/lib/api-auth/context";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";
import { corsHeaders } from "@/lib/api-auth/cors";
import type { Signal } from "@/lib/types/signal";

interface ResponseMeta {
  tier: SubscriptionTier;
  quotaUsed: number;
  quotaLimit: number;
  serverTime: number;
  cachedAt: number | null;
  dataFreshness: "delayed_15m" | "realtime";
}

interface TierResponse<T> {
  success: true;
  meta: ResponseMeta;
  data: T;
}

// ─── Signal Filtering ───

const FREE_SIGNAL_FIELDS: ReadonlySet<string> = new Set([
  "id", "pair", "action", "confidence", "price", "change24h",
]);

/** Strip advanced fields from signals for Free tier. */
function filterSignalsForFreeTier(signals: Signal[]): Signal[] {
  const maxSignals = TIER_CONFIGS.FREE.maxSignals;
  const sliced = signals.slice(0, maxSignals);

  return sliced.map((signal) => {
    const filtered: Record<string, unknown> = {};
    for (const key of FREE_SIGNAL_FIELDS) {
      if (key in signal) {
        filtered[key] = signal[key as keyof Signal];
      }
    }
    return filtered as unknown as Signal;
  });
}

/** Apply tier-based filtering to signals. */
export function filterSignalsByTier(signals: Signal[], tier: SubscriptionTier): Signal[] {
  if (tier === "FREE") {
    return filterSignalsForFreeTier(signals);
  }
  // Pro and Whale get full signals
  return signals;
}

// ─── Generic Data Filtering ───

/** Apply tier-specific transformations to any data module. */
export function filterDataByTier(
  moduleName: string,
  data: unknown,
  tier: SubscriptionTier,
): unknown {
  if (tier === "FREE") {
    // For free tier, add delayed metadata
    if (typeof data === "object" && data !== null) {
      return { ...data as Record<string, unknown>, _delayed: true };
    }
  }

  // Module-specific filtering
  if (moduleName === "signals" && Array.isArray(data)) {
    return filterSignalsByTier(data as Signal[], tier);
  }

  return data;
}

// ─── Response Builder ───

/** Build a tier-aware API response with meta envelope. */
export function buildTierResponse<T>(
  data: T,
  ctx: AuthContext,
  endpoint: ApiEndpoint | string,
  cachedAt: number | null = null,
): Response {
  const meta: ResponseMeta = {
    tier: ctx.tier,
    quotaUsed: ctx.usageToday,
    quotaLimit: ctx.tierConfig.requestsPerDay === Infinity
      ? -1
      : ctx.tierConfig.requestsPerDay,
    serverTime: Date.now(),
    cachedAt,
    dataFreshness: ctx.tierConfig.dataFreshness,
  };

  const body: TierResponse<T> = {
    success: true,
    meta,
    data,
  };

  const isWhale = ctx.tier === "WHALE";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Cache": cachedAt ? "HIT" : "MISS",
    "X-Data-Freshness": ctx.tierConfig.dataFreshness,
    "X-RateLimit-Limit": String(ctx.tierConfig.rateLimitPerMin),
    ...(isWhale
      ? { "Cache-Control": "no-store" }
      : {
          "Cache-Control": `private, max-age=${ctx.tierConfig.cacheTtlSeconds}`,
        }),
    ...corsHeaders("*", ctx.tier),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers,
  });
}
