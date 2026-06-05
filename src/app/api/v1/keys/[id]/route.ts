/**
 * DELETE /api/v1/keys/[id] — Revoke an API key.
 */

import { getPrismaClient } from "@/lib/db/client";
import { authenticateV1Request } from "@/lib/api-auth/middleware";
import { v1ApiError } from "@/lib/api-v1/errors";
import { corsHeaders } from "@/lib/api-auth/cors";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const authResult = await authenticateV1Request(req, "SIGNALS");
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Must use session auth to revoke keys
  if (ctx.authMethod !== "session") {
    return v1ApiError("AUTH_INVALID", 401);
  }

  const prisma = getPrismaClient();

  // Verify the key belongs to this user
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      walletProfileId: ctx.walletProfileId,
      status: "ACTIVE",
    },
  });

  if (!apiKey) {
    return v1ApiError("NOT_FOUND");
  }

  await prisma.apiKey.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: { id, status: "REVOKED" },
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
