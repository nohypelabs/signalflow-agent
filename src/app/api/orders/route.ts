import { NextRequest } from "next/server";
import { jsonNoCache } from "@/lib/api/no-cache";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { markIdempotency, readIdempotency } from "@/lib/security/idempotency";
import { requireTradingAuthorization } from "@/lib/security/trading-auth";
import { placePerpOrder, toPerpsSymbol } from "@/lib/sodex-perps";
import { z } from "zod";

export const dynamic = "force-dynamic";

const perpsOrderSchema = z.object({
  symbol: z.string().trim().min(1),
  side: z.enum(["LONG", "SHORT"]),
  type: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  quantity: z.string().trim().min(1),
  leverage: z.number().int().min(1).max(100).default(1),
  reduceOnly: z.boolean().default(false),
  price: z.string().trim().optional(),
  clientOrderId: z.string().trim().min(1).max(120).optional(),
  accountID: z.number().int().min(0).optional(),
  symbolID: z.number().int().min(1).optional(),
}).strict();

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = perpsOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonNoCache(
        { error: "Invalid order", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const order = parsed.data;

    // Idempotency check
    if (order.clientOrderId) {
      const existing = readIdempotency(order.clientOrderId);
      if (existing?.response) {
        return jsonNoCache(existing.response, {
          status: existing.status === "rejected" ? 403 : 200,
        });
      }
      markIdempotency(order.clientOrderId, "pending");
    }

    // Auth check
    const auth = await requireTradingAuthorization(req);
    if (auth instanceof Response) {
      const response = { error: "Authentication failed." };
      if (order.clientOrderId) markIdempotency(order.clientOrderId, "rejected", response);
      return jsonNoCache(
        { error: "Authentication failed. Connect wallet and ensure SoDEX API keys are configured." },
        { status: 401 },
      );
    }

    // Build SoDEX perps order
    const perpsSymbol = toPerpsSymbol(order.symbol);
    const perpsOrder = {
      accountID: order.accountID ?? 0,
      symbolID: order.symbolID ?? 1,
      side: (order.side === "LONG" ? 1 : 2) as 1 | 2,
      type: (order.type === "MARKET" ? 2 : 1) as 1 | 2,
      quantity: order.quantity,
      reduceOnly: order.reduceOnly,
      positionSide: (order.side === "LONG" ? 1 : 2) as 1 | 2 | 3,
      ...(order.price ? { price: order.price } : {}),
    };

    const result = await placePerpOrder(perpsOrder, {
      apiKeyName: auth.apiKeyName,
      apiKeyPrivate: auth.apiKeyPrivate,
    });

    const response = {
      success: true,
      source: "SoDEX Perps",
      symbol: perpsSymbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      leverage: order.leverage,
      result,
    };

    if (order.clientOrderId) markIdempotency(order.clientOrderId, "completed", response);
    return jsonNoCache(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order placement failed";
    console.error("[/api/orders POST]", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  // GET returns open orders / positions list as plain array to match fetchOrders() contract.
  // (Currently falls back to perps positions when address provided; real open orders fetch
  // can be added later by calling the authenticated /trade/orders list endpoint.)
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return jsonNoCache([]);
  }

  try {
    const { getPerpsPositions } = await import("@/lib/sodex-perps");
    const data = await getPerpsPositions(address);
    return jsonNoCache(data.positions ?? []);
  } catch {
    return jsonNoCache([]);
  }
}
