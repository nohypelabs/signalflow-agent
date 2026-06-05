/**
 * Lemon Squeezy webhook endpoint.
 * Verifies HMAC-SHA256 signature and dispatches events.
 */

import { createHmac } from "crypto";
import { handleWebhookEvent } from "@/lib/subscription/webhook-handler";

export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: Request): Promise<Response> {
  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!signature || !verifySignature(rawBody, signature)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = JSON.parse(rawBody);
    const result = await handleWebhookEvent(payload);

    if (!result.success) {
      console.warn("[LemonSqueezy Webhook] Unhandled:", result.action);
    }

    return new Response(JSON.stringify({ received: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LemonSqueezy Webhook] Error:", error);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
