import { NextRequest, NextResponse } from "next/server";
import { getTickers, getKlines, getSymbols } from "@/lib/sodex";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const q = req.nextUrl.searchParams;

  try {
    switch (type) {
      case "tickers": {
        const symbol = q.get("symbol") || undefined;
        const data = await getTickers(symbol);
        return NextResponse.json(data);
      }
      case "klines": {
        const symbol = q.get("symbol");
        const interval = q.get("interval") || "1h";
        if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
        const data = await getKlines(
          symbol,
          interval,
          q.get("limit") ? Number(q.get("limit")) : undefined,
        );
        return NextResponse.json(data);
      }
      case "symbols": {
        const symbol = q.get("symbol") || undefined;
        const data = await getSymbols(symbol);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: "unknown market type" }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SoDEX fetch failed" },
      { status: 502 },
    );
  }
}
