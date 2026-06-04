import { NextRequest } from "next/server";
import { getPerpsPositions } from "@/lib/sodex-perps";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return jsonNoCache({ error: "Missing address" }, { status: 400 });
  }

  try {
    const data = await getPerpsPositions(address);
    return jsonNoCache({
      positions: data.positions ?? [],
      blockTime: data.blockTime,
      blockHeight: data.blockHeight,
      source: "SoDEX Perps",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Balance fetch failed";
    console.error("[/api/balance] GET error:", msg);
    return jsonNoCache({ error: msg, positions: [] }, { status: 502 });
  }
}
