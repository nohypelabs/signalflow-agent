import { NextRequest, NextResponse } from "next/server";
import { placeOrder, getOpenOrders } from "@/lib/sodex";

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
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order placement failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    const orders = await getOpenOrders();
    return NextResponse.json(orders);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch orders" },
      { status: 502 },
    );
  }
}
