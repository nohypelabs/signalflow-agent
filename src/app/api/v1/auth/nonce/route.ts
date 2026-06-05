/**
 * GET /api/v1/auth/nonce — Generate a SIWE nonce for wallet authentication.
 */

import { generateNonce } from "@/lib/api-auth/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { nonce, message } = generateNonce();

  return new Response(
    JSON.stringify({
      success: true,
      data: { nonce, message },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
