/**
 * CORS headers builder for external API consumers.
 * Tier-aware: Access-Control-Max-Age varies by subscription level.
 */

import type { SubscriptionTier } from "@/lib/api-auth/context";

const DEFAULT_ALLOWED_ORIGINS = "*";

function getAllowedOrigins(): string[] {
  const envValue = process.env.API_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS;
  if (envValue === "*") return ["*"];
  return envValue.split(",").map((o) => o.trim()).filter(Boolean);
}

/** Build CORS response headers for a given origin and tier. */
export function corsHeaders(
  origin: string,
  tier: SubscriptionTier,
): Record<string, string> {
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed[0] === "*" ? origin : (allowed.find((o) => o === origin) ?? allowed[0]);

  const maxAge = tier === "FREE" ? "600" : tier === "PRO" ? "3600" : "7200";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
    "Access-Control-Max-Age": maxAge,
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Cache, X-Data-Freshness",
  };
}
