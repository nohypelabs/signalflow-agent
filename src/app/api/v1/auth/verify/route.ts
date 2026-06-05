/**
 * POST /api/v1/auth/verify — Verify wallet signature and create session.
 */

import { verifyMessage } from "viem";
import { getPrismaClient } from "@/lib/db/client";
import { consumeNonce, createSessionToken, sessionCookieAttributes } from "@/lib/api-auth/session";
import { resolveEffectiveTier } from "@/lib/subscription/tier-resolver";
import { authVerifyBodySchema } from "@/lib/api-v1/zod-schemas";
import { v1ApiError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const parsed = authVerifyBodySchema.safeParse(body);

    if (!parsed.success) {
      return v1ApiError("INVALID_PARAMS", 400, {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const { message, signature } = parsed.data;

    // Extract nonce from the message
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
    if (!nonceMatch) {
      return v1ApiError("AUTH_INVALID");
    }

    const nonce = nonceMatch[1];
    if (!consumeNonce(nonce)) {
      return v1ApiError("AUTH_INVALID");
    }

    // Extract address from the message (line 3 of SIWE format)
    const lines = message.split("\n");
    const address = lines[2]?.trim() as `0x${string}`;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return v1ApiError("AUTH_INVALID");
    }

    // Verify signature using viem
    const isValid = await verifyMessage({ address, message, signature: signature as `0x${string}` });
    if (!isValid) {
      return v1ApiError("AUTH_INVALID");
    }

    // Upsert wallet profile
    const prisma = getPrismaClient();
    const normalizedWallet = address.toLowerCase();
    const profile = await prisma.walletProfile.upsert({
      where: { normalizedWallet },
      create: {
        walletAddress: address,
        normalizedWallet,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });

    // Resolve tier
    const { tier } = await resolveEffectiveTier(profile.id);

    // Create session token
    const token = createSessionToken(normalizedWallet, tier);
    const cookieStr = sessionCookieAttributes().replace("{token}", token);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          walletAddress: address,
          normalizedWallet,
          tier,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieStr,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[Auth Verify] Error:", error);
    return v1ApiError("SERVER_ERROR");
  }
}
