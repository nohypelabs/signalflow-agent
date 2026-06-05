/**
 * SIWE-style wallet session management.
 * Lightweight implementation using viem for signature verification — no external SIWE library needed.
 */

import { createHash, randomBytes } from "crypto";
import type { SubscriptionTier } from "@/lib/api-auth/context";

// ─── In-memory nonce store (per-instance, serverless-safe) ───

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const nonceStore = new Map<string, NonceEntry>();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a nonce for SIWE authentication. */
export function generateNonce(): { nonce: string; message: string } {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();

  // Store nonce with expiry
  nonceStore.set(nonce, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });

  // Cleanup expired nonces (best-effort)
  if (nonceStore.size > 1000) {
    const now = Date.now();
    for (const [key, entry] of nonceStore) {
      if (entry.expiresAt <= now) nonceStore.delete(key);
    }
  }

  const message = [
    "signalflow.agent wants you to sign in with your Ethereum account:",
    "",
    "{address}",
    "",
    "Sign in to access the SignalFlow API.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");

  return { nonce, message };
}

/** Verify that a nonce was issued and hasn't been used. Returns true and consumes the nonce. */
export function consumeNonce(nonce: string): boolean {
  const entry = nonceStore.get(nonce);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    nonceStore.delete(nonce);
    return false;
  }
  // One-time use
  nonceStore.delete(nonce);
  return true;
}

// ─── JWT Session Token ───

const JWT_ALG = "HS256";

function getSigningSecret(): string {
  const secret = process.env.SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SIGNING_SECRET env var must be at least 32 characters");
  }
  return secret;
}

interface SessionPayload {
  sub: string; // normalizedWallet
  tier: SubscriptionTier;
  iat: number;
  exp: number;
}

/** Create a JWT session token. */
export function createSessionToken(
  walletAddress: string,
  tier: SubscriptionTier,
): string {
  const secret = getSigningSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 hours

  const payload: SessionPayload = { sub: walletAddress, tier, iat, exp };

  // Simple JWT: base64url(header).base64url(payload).hmac(header.payload)
  const header = btoa(JSON.stringify({ alg: JWT_ALG, typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signatureInput = `${header}.${payloadB64}`;
  const signature = createHash("sha256")
    .update(`${signatureInput}.${secret}`)
    .digest("hex");

  return `${signatureInput}.${signature}`;
}

/** Validate a JWT session token. Returns the payload or null. */
export function validateSessionToken(token: string): SessionPayload | null {
  const secret = getSigningSecret();
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payloadB64, signature] = parts;

  // Verify signature
  const expectedSig = createHash("sha256")
    .update(`${header}.${payloadB64}.${secret}`)
    .digest("hex");

  if (signature !== expectedSig) return null;

  try {
    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Extract session token from cookies. */
export function getSessionFromCookies(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)sf_session=([^;]+)/);
  return match?.[1] ?? null;
}

/** Session cookie attributes for Set-Cookie header. */
export function sessionCookieAttributes(): string {
  return [
    "sf_session={token}",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=86400",
  ].join("; ");
}
