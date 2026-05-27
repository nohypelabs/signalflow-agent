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
  try {
    await cancelOrder(Number(id));
    return jsonNoCache({ success: true });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Cancel failed" },
      { status: 502 },
    );
  }
}
