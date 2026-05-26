import {
  getCurrencies,
  getETFSummary,
  getNewsHot,
  getMacroEvents,
  getBTCTreasuries,
  getETFList,
  getKlines,
  getIndexSnapshot,
} from "@/lib/sosovalue";
import { getTickers, getSymbols } from "@/lib/sodex";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

interface ModuleStatus {
  name: string;
  status: "active" | "error";
  count: number;
  detail: string;
  color: string;
}

const MODULE_COLORS: Record<string, string> = {
  "Currency & Pairs": "#00d4ff",
  "ETF Data": "#00ff88",
  "News Feeds": "#F59E0B",
  "Macro Events": "#00ffcc",
  "SoSoValue Index": "#22D3EE",
  "BTC Treasuries": "#ff4488",
  "Crypto Stocks": "#ff8800",
  "SoDEX Market": "#00ff88",
  "SoDEX Symbols": "#44aaff",
};

let cache: { data: ModuleStatus[]; ts: number } | null = null;
const CACHE_MS = 120_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return jsonNoCache({ modules: cache.data, updated: cache.ts });
  }

  const checks: Promise<ModuleStatus>[] = [
    getCurrencies()
      .then((c) => ({
        name: "Currency & Pairs",
        status: "active" as const,
        count: c.length,
        detail: `${c.length} currencies tracked`,
        color: MODULE_COLORS["Currency & Pairs"],
      }))
      .catch(() => ({
        name: "Currency & Pairs",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["Currency & Pairs"],
      })),

    getETFSummary("BTC", "US", 1)
      .then((d) => ({
        name: "ETF Data",
        status: "active" as const,
        count: d.length,
        detail: d.length
          ? `Latest flow: $${(d[0].total_net_inflow / 1e6).toFixed(0)}M`
          : "No data",
        color: MODULE_COLORS["ETF Data"],
      }))
      .catch(() => ({
        name: "ETF Data",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["ETF Data"],
      })),

    getNewsHot(1, 1)
      .then((r) => ({
        name: "News Feeds",
        status: "active" as const,
        count: r.total,
        detail: `${r.total} hot articles available`,
        color: MODULE_COLORS["News Feeds"],
      }))
      .catch(() => ({
        name: "News Feeds",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["News Feeds"],
      })),

    getMacroEvents()
      .then((e) => ({
        name: "Macro Events",
        status: "active" as const,
        count: e.length,
        detail: `${e.length} event days tracked`,
        color: MODULE_COLORS["Macro Events"],
      }))
      .catch(() => ({
        name: "Macro Events",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["Macro Events"],
      })),

    getBTCTreasuries()
      .then((c) => ({
        name: "BTC Treasuries",
        status: "active" as const,
        count: c.length,
        detail: `${c.length} public companies`,
        color: MODULE_COLORS["BTC Treasuries"],
      }))
      .catch(() => ({
        name: "BTC Treasuries",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["BTC Treasuries"],
      })),

    getETFList("BTC", "US")
      .then((l) => ({
        name: "Crypto Stocks",
        status: "active" as const,
        count: l.length,
        detail: `${l.length} ETFs listed`,
        color: MODULE_COLORS["Crypto Stocks"],
      }))
      .catch(() => ({
        name: "Crypto Stocks",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["Crypto Stocks"],
      })),

    getIndexSnapshot("ssimag7")
      .then(() => ({
        name: "SoSoValue Index",
        status: "active" as const,
        count: 1,
        detail: "Index snapshot available",
        color: MODULE_COLORS["SoSoValue Index"],
      }))
      .catch(() => ({
        name: "SoSoValue Index",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["SoSoValue Index"],
      })),

    getTickers()
      .then((t) => ({
        name: "SoDEX Market",
        status: "active" as const,
        count: t.length,
        detail: `${t.length} trading pairs live`,
        color: MODULE_COLORS["SoDEX Market"],
      }))
      .catch(() => ({
        name: "SoDEX Market",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["SoDEX Market"],
      })),

    getSymbols()
      .then((s) => ({
        name: "SoDEX Symbols",
        status: "active" as const,
        count: s.length,
        detail: `${s.length} symbols registered`,
        color: MODULE_COLORS["SoDEX Symbols"],
      }))
      .catch(() => ({
        name: "SoDEX Symbols",
        status: "error" as const,
        count: 0,
        detail: "Connection failed",
        color: MODULE_COLORS["SoDEX Symbols"],
      })),
  ];

  const modules = await Promise.all(checks);
  cache = { data: modules, ts: Date.now() };

  return jsonNoCache({ modules, updated: cache.ts });
}
