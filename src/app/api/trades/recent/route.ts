import { NextRequest } from "next/server";
import { getRecentTrades } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const symbol = q.get("symbol");
  if (!symbol) return jsonNoCache({ error: "symbol required" }, { status: 400 });

  const limit = q.get("limit") ? Number(q.get("limit")) : 50;

  try {
    const trades = await getRecentTrades(symbol, limit);
    return jsonNoCache({ trades, updated: Date.now() });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed to fetch trades" },
      { status: 502 },
    );
  }
}
