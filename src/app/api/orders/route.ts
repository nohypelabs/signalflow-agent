import { NextRequest } from "next/server";
import { placeOrder, getOpenOrders } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.SODEX_API_KEY_NAME) {
    return jsonNoCache(
      { error: "SoDEX API key not configured. Set SODEX_API_KEY_NAME in .env.local" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    if (!body?.symbol || !body?.side || !body?.type || !body?.quantity) {
      return jsonNoCache({ error: "Invalid order payload" }, { status: 400 });
    }

    const result = await placeOrder(body);
    return jsonNoCache(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order placement failed";
    console.error("[/api/orders POST]", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

export async function GET() {
  if (!process.env.SODEX_API_KEY_NAME) {
    return jsonNoCache([], {
      headers: {
        "X-SignalFlow-Warning": "SoDEX API key not configured",
      },
    });
  }

  try {
    const orders = await getOpenOrders();
    return jsonNoCache(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch orders";
    console.warn("[/api/orders GET] SoDEX unavailable; returning empty open orders:", msg);
    return jsonNoCache([], {
      headers: {
        "X-SignalFlow-Warning": msg.slice(0, 180),
      },
    });
  }
}
