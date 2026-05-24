import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/lib/sodex";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await cancelOrder(Number(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cancel failed" },
      { status: 502 },
    );
  }
}
