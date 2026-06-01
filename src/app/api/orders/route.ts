import { NextRequest } from "next/server";
import { jsonNoCache } from "@/lib/api/no-cache";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { markIdempotency, readIdempotency } from "@/lib/security/idempotency";
import { requireTradingAuthorization } from "@/lib/security/trading-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const clientOrderId = typeof body?.clientOrderId === "string" ? body.clientOrderId.trim() : "";

    if (!body?.symbol || !body?.side || !body?.type || !body?.quantity) {
      return jsonNoCache({ error: "Invalid order payload" }, { status: 400 });
    }

    if (clientOrderId) {
      const existing = readIdempotency(clientOrderId);
      if (existing?.response) {
        return jsonNoCache(existing.response, { status: existing.status === "rejected" ? 403 : 200 });
      }
      markIdempotency(clientOrderId, "pending");
    }

    const auth = await requireTradingAuthorization(req);
    if (auth instanceof Response) {
      const response = { error: "Live trading is disabled until authentication is implemented." };
      if (clientOrderId) markIdempotency(clientOrderId, "rejected", response);
      return jsonNoCache(response, { status: 403 });
    }

    return jsonNoCache({ error: "Trading authorization unavailable" }, { status: 403 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order placement failed";
    console.error("[/api/orders POST]", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  const auth = await requireTradingAuthorization(req);
  if (auth instanceof Response) {
    return auth;
  }

  return jsonNoCache({ error: "Trading authorization unavailable" }, { status: 403 });
}
