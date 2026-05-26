import { NextRequest } from "next/server";
import { getAccountBalances } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return jsonNoCache({ error: "Missing address" }, { status: 400 });
  }

  try {
    const balances = await getAccountBalances(address);
    return jsonNoCache({ balances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Balance fetch failed";
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}
