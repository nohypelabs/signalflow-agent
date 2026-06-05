/**
 * GET /api/v1/system-data — Aggregated data endpoint.
 * Accepts ?include=signals,market,etf,macro,news,performance,funding
 * Returns all requested data modules in a single response.
 */

import type { ApiEndpoint } from "@prisma/client";
import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { isEndpointAllowed } from "@/lib/api-v1/tier-limits";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { getCachedResponse, setCachedResponse, buildCacheKey } from "@/lib/api-v1/cache";
import { corsHeaders } from "@/lib/api-auth/cors";
import { systemDataQuerySchema, type IncludeModule } from "@/lib/api-v1/zod-schemas";
import { fetchSystemData } from "@/lib/api-v1/data-fetcher";
import { filterDataByTier } from "@/lib/api-v1/response-builder";

export const dynamic = "force-dynamic";

const MODULE_TO_ENDPOINT: Record<IncludeModule, ApiEndpoint> = {
  signals: "SIGNALS",
  market: "MARKET_TICKERS",
  orderbook: "MARKET_ORDERBOOK",
  etf: "ETF_FLOW",
  macro: "MACRO",
  news: "NEWS",
  performance: "PERFORMANCE",
  regime: "SIGNALS",
  funding: "FUNDING",
  correlation: "CORRELATION",
  screener: "SCREENER",
  backtest: "BACKTEST",
};

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE"),
  });
}

export async function GET(req: Request): Promise<Response> {
  // 1. Parse query params
  const url = new URL(req.url);
  const parsed = systemDataQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const requestedModules = parsed.data.include;

  // 2. Authenticate
  const authResult = await authenticateV1Request(req, "SYSTEM_DATA");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // 3. Filter modules by tier access
  const allowedModules = requestedModules.filter((mod) =>
    isEndpointAllowed(ctx.tier, MODULE_TO_ENDPOINT[mod]),
  );
  const excludedModules = requestedModules.filter(
    (mod) => !allowedModules.includes(mod),
  );

  // 4. Check cache
  const cacheKey = buildCacheKey("system-data", `include=${allowedModules.join(",")}`, ctx.tier);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return buildTierResponse(cached, ctx, "SYSTEM_DATA", Date.now());
  }

  // 5. Fetch data
  try {
    const data = await fetchSystemData(allowedModules);

    // 6. Apply tier filtering per module
    const filtered: Record<string, unknown> = {};
    for (const [module, moduleData] of Object.entries(data)) {
      filtered[module] = filterDataByTier(module, moduleData, ctx.tier);
    }

    // 7. Cache
    setCachedResponse(cacheKey, filtered, ctx.tier);

    // 8. Build response with metadata about included/excluded modules
    const response = {
      modulesRequested: requestedModules,
      modulesIncluded: allowedModules,
      modulesExcluded: excludedModules,
      ...filtered,
    };

    return buildTierResponse(response, ctx, "SYSTEM_DATA");
  } catch (error) {
    console.error("[V1 System Data] Error:", error);
    return v1ApiError("SERVER_ERROR");
  }
}
