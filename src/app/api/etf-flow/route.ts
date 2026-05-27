import { getETFSummary, getETFList } from "@/lib/sosovalue";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") || "BTC";
  const country = url.searchParams.get("country") || "US";
  const limit = parseInt(url.searchParams.get("limit") || "30", 10);

  try {
    const [summary, etfList] = await Promise.all([
      getETFSummary(symbol, country, limit),
      getETFList(symbol, country).catch(() => []),
    ]);

    return jsonNoCache({
      symbol,
      country,
      data: summary,
      etfs: etfList,
      totalInflow: summary.reduce((s, d) => s + d.total_net_inflow, 0),
      cumInflow: summary.length > 0 ? summary[0].cum_net_inflow : 0,
      latestAUM: summary.length > 0 ? summary[0].total_net_assets : 0,
    });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}
