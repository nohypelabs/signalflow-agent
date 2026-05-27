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
    const result = await placeOrder({
      symbol: body.symbol,
      side: body.side,
      type: body.type,
      quantity: body.quantity,
      price: body.price,
    });
    return jsonNoCache(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order placement failed";
    console.error("[/api/orders POST]", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}

export async function GET() {
  if (!process.env.SODEX_API_KEY_NAME) {
    return jsonNoCache([]);
  }

  try {
    const orders = await getOpenOrders();
    return jsonNoCache(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch orders";
    console.error("[/api/orders GET] SoDEX error:", msg);
    // Return empty array so UI doesn't break
    return jsonNoCache([]);
  }
}
