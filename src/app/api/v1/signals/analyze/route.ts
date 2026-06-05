/**
 * POST /api/v1/signals/analyze — AI-enriched single-coin signal analysis.
 * Pro+ only. Body: { coin, provider?, model?, apiKey?, strategy? }
 */

import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { buildTierResponse } from "@/lib/api-v1/response-builder";
import { corsHeaders } from "@/lib/api-auth/cors";
import { signalsAnalyzeBodySchema } from "@/lib/api-v1/zod-schemas";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin") ?? "*", "FREE") });
}

export async function POST(req: Request): Promise<Response> {
  const authResult = await authenticateV1Request(req, "SIGNALS_ANALYZE");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Pro+ only
  if (!ctx.tierConfig.canAnalyze) {
    return v1ApiError("TIER_FORBIDDEN", 403, { tier: ctx.tier });
  }

  const body = await req.json();
  const parsed = signalsAnalyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  try {
    // Forward to the existing analyze endpoint logic
    const analyzeRes = await fetch(new URL(`/api/signals/analyze`, req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!analyzeRes.ok) {
      const errorData = await analyzeRes.json().catch(() => ({ error: "Analysis failed" }));
      return v1ApiError("UPSTREAM_ERROR", 502);
    }

    const data = await analyzeRes.json();
    return buildTierResponse(data, ctx, "SIGNALS_ANALYZE");
  } catch (error) {
    console.error("[V1 Signals Analyze] Error:", error);
    return v1ApiError("SERVER_ERROR");
  }
}
