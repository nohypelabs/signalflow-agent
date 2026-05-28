import { NextRequest } from "next/server";
import { cancelOrder } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.SODEX_API_KEY_NAME) {
    return jsonNoCache(
      { error: "SoDEX API key not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return jsonNoCache({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    await cancelOrder(orderId);
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Cancel failed" },
      { status: 502 },
    );
  }
}
