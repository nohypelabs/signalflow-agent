/**
 * GET /api/v1/signals — Signals with dimensions and multi-TF confluence.
 * Query: ?type=scalping|intraday|swing|position&strategy=confluence|liquidityFlow
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse, filterSignalsByTier } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { signalsQuerySchema } from "@/lib/api-v1/zod-schemas";
import { fetchSignals } from "@/lib/api-v1/data-fetcher";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = signalsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const authResult = await authenticateV1Request(req, "SIGNALS");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Check endpoint access
  if (!ctx.tierConfig.allowedEndpoints.has("SIGNALS")) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  // Check cache
  const cacheKey = buildCacheKey("signals", url.searchParams.toString(), ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return buildTierResponse(cached, ctx, "SIGNALS", Date.now());
  }

  try {
    const result = await fetchSignals(parsed.data.type, parsed.data.strategy);

    // Apply tier filtering to signals
    const filteredSignals = filterSignalsByTier(result.signals, ctx.tier);
    const response = {
      updated: result.updated,
      engine: result.engine,
      signals: filteredSignals,
      sources: result.sources,
      dimensions: result.dimensions,
      overall: result.overall,
      weights: result.weights,
      capped: result.capped,
    };

    setCachedResponse(cacheKey, response, ctx.tier);
    return buildTierResponse(response, ctx, "SIGNALS");
  } catch (error) {
    console.error("[V1 Signals] Error:", error);
    return v1ApiError("UPSTREAM_ERROR");
  }
}
