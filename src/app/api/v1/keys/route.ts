/**
 * GET /api/v1/keys — List user's API keys.
 * POST /api/v1/keys — Create a new API key.
 */

import { getPrismaClient } from "@/lib/db/client";
import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { generateApiKey } from "@/lib/api-auth/api-key";
import { createApiKeyBodySchema } from "@/lib/api-v1/zod-schemas";
import { corsHeaders } from "@/lib/api-auth/cors";
import { TIER_CONFIGS } from "@/lib/api-v1/tier-limits";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authResult = await authenticateV1Request(req, "SIGNALS" /* reuse a basic endpoint for auth */);
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // API key management requires session auth (not API key auth)
  if (ctx.authMethod !== "session") {
    return v1ApiError("AUTH_INVALID", 401, {
      tier: ctx.tier,
    });
  }

  const prisma = getPrismaClient();
  const keys = await prisma.apiKey.findMany({
    where: {
      walletProfileId: ctx.walletProfileId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: keys.map((k) => ({
        ...k,
        // Never expose the hash
        keyPreview: `${k.keyPrefix}...****`,
      })),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...corsHeaders(req.headers.get("origin") ?? "*", ctx.tier),
      },
    },
  );
}

export async function POST(req: Request): Promise<Response> {
  const authResult = await authenticateV1Request(req, "SIGNALS");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Must use session auth to create API keys
  if (ctx.authMethod !== "session") {
    return v1ApiError("AUTH_INVALID", 401);
  }

  const body = await req.json();
  const parsed = createApiKeyBodySchema.safeParse(body);
  if (!parsed.success) {
    return v1ApiError("INVALID_PARAMS", 400, {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const { name } = parsed.data;

  // Check API key limit for tier
  const prisma = getPrismaClient();
  const existingCount = await prisma.apiKey.count({
    where: {
      walletProfileId: ctx.walletProfileId,
      status: "ACTIVE",
    },
  });

  const maxKeys = TIER_CONFIGS[ctx.tier].maxApiKeys;
  if (existingCount >= maxKeys) {
    return v1ApiError("QUOTA_EXCEEDED", 429, {
      tier: ctx.tier,
      quotaUsed: existingCount,
      quotaLimit: maxKeys,
    });
  }

  // Generate new key
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      walletProfileId: ctx.walletProfileId,
      name,
      keyPrefix,
      keyHash,
      status: "ACTIVE",
    },
  });

  // Return the raw key ONE TIME ONLY
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        name,
        key: rawKey,
        warning: "Store this key securely. It will not be shown again.",
      },
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...corsHeaders(req.headers.get("origin") ?? "*", ctx.tier),
      },
    },
  );
}
