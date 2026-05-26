"use client";

import { useDataSources } from "@/lib/hooks/useDataSources";
import { useStatus } from "@/lib/hooks/useStatus";

/* ── Status config ── */

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  live: { label: "LIVE", color: "text-buy", dot: "bg-buy" },
  degraded: { label: "DEGRADED", color: "text-hold", dot: "bg-hold" },
  offline: { label: "OFFLINE", color: "text-sell", dot: "bg-sell" },
  loading: { label: "...", color: "text-txt-faint", dot: "bg-txt-faint" },
};

/* ── Group definitions ── */

interface SourceGroup {
  name: string;
  icon: string;
  color: string;
  modules: string[];
  description: string;
}

const GROUPS: SourceGroup[] = [
  {
    name: "SoSoValue",
    icon: "📊",
    color: "#00d4ff",
    modules: ["Currency & Pairs", "ETF Data", "News Feeds", "Macro Events", "BTC Treasuries", "Crypto Stocks", "SoSoValue Index"],
    description: "ETF flows, news, macro, treasuries",
  },
  {
    name: "SoDEX",
    icon: "⚡",
    color: "#00E5A8",
    modules: ["SoDEX Market", "SoDEX Symbols"],
    description: "Live trading pairs & orderbook",
  },
  {
    name: "AI Provider",
    icon: "🧠",
    color: "#8B5CF6",
    modules: [],
    description: "Deepseek signal generation",
  },
];

/* ── Component ── */

export default function DataSources() {
  const { modules, loading, error } = useDataSources();
  const { services } = useStatus();

  // Group modules
  const groupStatuses = GROUPS.map((g) => {
    if (g.name === "AI Provider") {
      // Use status check for AI provider
      const aiService = services.find((s) => s.name === "Deepseek AI");
      if (!aiService) return { ...g, status: "loading" as const, healthy: 0, total: 1, detail: "Verifying connection..." };
      return {
        ...g,
        status: aiService.status === "connected" ? "live" as const : aiService.status === "no_key" ? "degraded" as const : "offline" as const,
        healthy: aiService.status === "connected" ? 1 : 0,
        total: 1,
        detail: aiService.detail,
        latencyMs: aiService.latencyMs,
      };
    }

    const groupModules = modules.filter((m) => g.modules.includes(m.name));
    const healthy = groupModules.filter((m) => m.status === "active").length;
    const total = groupModules.length;

    if (loading) return { ...g, status: "loading" as const, healthy: 0, total: 0, detail: "Verifying live data sources" };
    if (total === 0) return { ...g, status: "offline" as const, healthy: 0, total: 0, detail: "No data" };

    const status = healthy === total ? "live" as const : healthy > 0 ? "degraded" as const : "offline" as const;
    const detail = healthy === total
      ? `${total} modules active`
      : `${healthy}/${total} modules active`;

    return { ...g, status, healthy, total, detail };
  });

  // Also include SoDEX service status
  const sodexService = services.find((s) => s.name === "SoDEX");
  const sosovalueService = services.find((s) => s.name === "SoSoValue API");

  // Overall health
  const allLive = groupStatuses.every((g) => g.status === "live");
  const anyOffline = groupStatuses.some((g) => g.status === "offline");

  return (
    <div className="bg-card border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Data Sources</h3>
          <span className={`flex items-center gap-1 text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
            allLive ? "bg-buy-muted text-buy" : anyOffline ? "bg-sell-muted text-sell" : "bg-hold-muted text-hold"
          }`}>
            <span className={`w-1 h-1 rounded-full ${allLive ? "bg-buy animate-pulse" : anyOffline ? "bg-sell" : "bg-hold"}`} />
            {allLive ? "ALL LIVE" : anyOffline ? "DEGRADED" : "PARTIAL"}
          </span>
        </div>
        <span className="text-[9px] text-txt-faint font-mono">
          {modules.filter((m) => m.status === "active").length + (services.find((s) => s.name === "Deepseek AI")?.status === "connected" ? 1 : 0)} sources
        </span>
      </div>

      {/* Source cards */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {groupStatuses.map((g) => {
          const cfg = statusConfig[g.status];
          return (
            <div
              key={g.name}
              className="bg-elevated/30 rounded-lg p-3 border border-border-default hover:border-border-muted transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{g.icon}</span>
                  <span className="text-xs font-semibold text-txt-primary">{g.name}</span>
                </div>
                <span className={`flex items-center gap-1 text-[8px] uppercase tracking-wider font-bold ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${g.status === "live" ? "animate-pulse" : ""}`} />
                  {cfg.label}
                </span>
              </div>

              <p className="text-[10px] text-txt-dim mb-1.5">{g.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-txt-muted">{g.detail}</span>
                {"latencyMs" in g && g.latencyMs !== undefined && g.latencyMs > 0 && (
                  <span className="text-[9px] text-txt-faint font-mono">{g.latencyMs}ms</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Service endpoints */}
      <div className="px-4 py-2 border-t border-border-default bg-inset/20">
        <div className="flex items-center justify-between text-[9px] text-txt-faint font-mono">
          <div className="flex items-center gap-3">
            {sosovalueService && (
              <span className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${sosovalueService.status === "connected" ? "bg-buy" : "bg-sell"}`} />
                SoSoValue {sosovalueService.latencyMs > 0 && `${sosovalueService.latencyMs}ms`}
              </span>
            )}
            {sodexService && (
              <span className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${sodexService.status === "connected" ? "bg-buy" : "bg-sell"}`} />
                SoDEX {sodexService.latencyMs > 0 && `${sodexService.latencyMs}ms`}
              </span>
            )}
          </div>
          <span>Refresh: 2min</span>
        </div>
      </div>
    </div>
  );
}
