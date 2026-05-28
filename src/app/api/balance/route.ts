import { NextRequest } from "next/server";
import { getAccountBalances } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return jsonNoCache({ error: "Missing address" }, { status: 400 });
  }

  if (!process.env.SODEX_API_KEY_NAME) {
    return jsonNoCache(
      { error: "SoDEX API key not configured. Set SODEX_API_KEY_NAME in .env.local", balances: [] },
      { status: 503 },
    );
  }

  try {
    const balances = await getAccountBalances(address);
    return jsonNoCache({ balances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Balance fetch failed";
    console.error("[/api/balance] GET error:", msg);
    return jsonNoCache({ error: msg, balances: [] }, { status: 502 });
  }
}
