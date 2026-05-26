import { NextRequest } from "next/server";
import { cancelOrder } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
