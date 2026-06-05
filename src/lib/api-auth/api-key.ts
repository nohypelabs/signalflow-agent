/**
 * API key hashing and validation.
 * Keys are stored as SHA-256 hashes — the raw key is shown only once at creation.
 */

import { createHash, randomBytes } from "crypto";
import { getPrismaClient } from "@/lib/db/client";

const KEY_PREFIX = "sf_live_";

/** Hash a raw API key with SHA-256. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Generate a new API key. Returns the raw key (shown once) and the hash for storage. */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const bytes = randomBytes(32);
  const encoded = bytes.toString("base64url");
  const rawKey = `${KEY_PREFIX}${encoded}`;
  const keyHash = hashApiKey(rawKey);
  // Store first 8 chars after prefix for UX display (e.g. "sf_live_a1b2c3d4...")
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8);

  return { rawKey, keyHash, keyPrefix };
}

/** Validate an API key by hash lookup. Returns wallet profile ID and key ID, or null. */
export async function validateApiKey(
  rawKey: string,
): Promise<{ walletProfileId: string; apiKeyId: string; normalizedWallet: string } | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);

  const prisma = getPrismaClient();

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      walletProfileId: true,
      walletProfile: {
        select: { normalizedWallet: true },
      },
    },
  });

  if (!apiKey) return null;
  if (apiKey.status !== "ACTIVE") return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget lastUsedAt update (use fresh client to avoid hoisting issues)
  getPrismaClient().apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Intentionally ignored — non-critical telemetry
  });

  return {
    walletProfileId: apiKey.walletProfileId,
    apiKeyId: apiKey.id,
    normalizedWallet: apiKey.walletProfile.normalizedWallet,
  };
}

/** Extract API key from request headers. */
export function extractApiKeyFromRequest(req: Request): string | null {
  // Try Authorization: Bearer sf_live_xxx
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token.startsWith(KEY_PREFIX)) return token;
  }

  // Try x-api-key: sf_live_xxx
  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader?.startsWith(KEY_PREFIX)) return apiKeyHeader.trim();

  return null;
}
