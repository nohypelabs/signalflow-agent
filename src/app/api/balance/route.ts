import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances } from "@/lib/sodex";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const balances = await getAccountBalances(address);
    return NextResponse.json({ balances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Balance fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
