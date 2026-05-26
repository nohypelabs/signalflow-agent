import { NextRequest } from "next/server";
import { placeOrder, getOpenOrders } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Order placement failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    const orders = await getOpenOrders();
    return jsonNoCache(orders);
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed to fetch orders" },
      { status: 502 },
    );
  }
}
