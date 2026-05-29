"use client";

import { useState, useEffect } from "react";
import { useDataSources } from "@/lib/hooks/useDataSources";
import { useStatus } from "@/lib/hooks/useStatus";
import { getProvider } from "@/lib/ai-providers";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

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
    modules: ["Currency & Pairs", "ETF Data", "ETF Flow Analytics", "News Feeds", "News Sentiment", "Macro Events", "Macro Calendar", "Macro Event History", "BTC Treasuries", "Treasury Activity", "Crypto Stocks", "SoSoValue Index", "Index Snapshots"],
    description: "ETF flows, news sentiment, macro calendar, BTC treasuries, index tracking, market snapshots",
  },
  {
    name: "SoDEX",
    icon: "⚡",
    color: "#00E5A8",
    modules: ["SoDEX Market", "SoDEX Symbols", "Orderbook Depth", "Signal History"],
    description: "Live trading pairs, klines, orderbook depth, order execution, signal backtest",
  },
];

/* ── Component ── */

export default function DataSources() {
  const { modules, loading, error } = useDataSources();
  const { services } = useStatus();
  const [aiProviderId, setAiProviderId] = useState<string>("deepseek");
  const [moduleCollapsed, setModuleCollapsed] = useState<boolean>(true);

  // Read current AI provider from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("signalflow-ai-config");
      if (raw) {
        const config = JSON.parse(raw);
        if (config.providerId) setAiProviderId(config.providerId);
      }
    } catch {}
  }, []);

  const aiProvider = getProvider(aiProviderId);
  const aiService = services.find((s) => s.name !== "SoSoValue API" && s.name !== "SoDEX");

  // Group modules
  const groupStatuses = GROUPS.map((g) => {
    const groupModules = modules.filter((m) => g.modules.includes(m.name));
    const healthy = groupModules.filter((m) => m.status === "active").length;
    const total = groupModules.length;

    if (loading) return { ...g, status: "loading" as const, healthy: 0, total: 0, detail: "Verifying live data sources", latencyMs: 0 };
    if (total === 0) return { ...g, status: "offline" as const, healthy: 0, total: 0, detail: "No data", latencyMs: 0 };

    const status = healthy === total ? "live" as const : healthy > 0 ? "degraded" as const : "offline" as const;
    const detail = healthy === total ? `${total} modules active` : `${healthy}/${total} modules active`;

    // Get latency from service status
    const serviceName = g.name === "SoSoValue" ? "SoSoValue API" : "SoDEX";
    const svc = services.find((s) => s.name === serviceName);

    return { ...g, status, healthy, total, detail, latencyMs: svc?.latencyMs ?? 0 };
  });

  // AI Provider status
  const aiStatus = (() => {
    if (!aiService) return { status: "loading" as const, detail: "Verifying connection...", latencyMs: 0 };
    return {
      status: aiService.status === "connected" ? "live" as const : aiService.status === "no_key" ? "degraded" as const : "offline" as const,
      detail: aiService.detail,
      latencyMs: aiService.latencyMs,
    };
  })();

  const allGroups = [
    ...groupStatuses,
    {
      name: aiProvider?.name ?? "AI Model",
      icon: "🧠",
      color: "#A78BFA",
      modules: [],
      description: `Signal analysis via ${aiProvider?.name ?? "AI"} (${aiProvider?.defaultModel ?? "default model"})`,
      ...aiStatus,
    },
  ];

  // Overall health
  const allLive = allGroups.every((g) => g.status === "live");
  const anyOffline = allGroups.some((g) => g.status === "offline");
  const totalSources = modules.filter((m) => m.status === "active").length + (aiService?.status === "connected" ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-txt-primary tracking-tight">Data Sources</h2>
          <p className="text-xs text-txt-muted mt-0.5">Live connections to market data, trading, and AI providers.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${
            allLive ? "bg-buy-muted text-buy" : anyOffline ? "bg-sell-muted text-sell" : "bg-hold-muted text-hold"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${allLive ? "bg-buy animate-pulse" : anyOffline ? "bg-sell" : "bg-hold"}`} />
            {allLive ? "ALL SYSTEMS LIVE" : anyOffline ? "DEGRADED" : "PARTIAL"}
          </span>
          <span className="text-[10px] text-txt-dim font-mono">{totalSources} sources active</span>
        </div>
      </div>

      {/* Source cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {allGroups.map((g) => {
          const cfg = statusConfig[g.status];
          return (
            <Card key={g.name} padding="none" className="overflow-hidden hover:border-border-muted transition-colors">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{g.icon}</span>
                    <span className="text-sm font-semibold text-txt-primary">{g.name}</span>
                  </div>
                  <Badge variant={g.status === "live" ? "live" : g.status === "degraded" ? "warning" : g.status === "offline" ? "error" : "muted"} size="sm">
                    {cfg.label}
                  </Badge>
                </div>

                <p className="text-[10px] text-txt-dim mb-3">{g.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-txt-muted">{g.detail}</span>
                  {g.latencyMs > 0 && (
                    <span className="text-[9px] text-txt-faint font-mono">{g.latencyMs}ms</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Module detail table */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Module Status</h3>
            <span className="text-[10px] text-txt-faint font-mono">
              {modules.length + 1} modules
            </span>
          </div>
          <button
            onClick={() => setModuleCollapsed((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[10px] text-txt-dim hover:text-txt-secondary px-2 py-1 rounded-md border border-border-default hover:border-border-muted hover:bg-elevated/30 transition-colors"
            aria-expanded={!moduleCollapsed}
            aria-controls="module-status-content"
          >
            {moduleCollapsed ? "Expand" : "Collapse"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform duration-200 ${moduleCollapsed ? "" : "rotate-180"}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {moduleCollapsed ? (
          <div className="px-4 py-3 text-[11px] text-txt-faint">
            Detail module disembunyikan.
          </div>
        ) : loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="table-row" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-xs text-sell">Failed to load module status: {error}</p>
          </div>
        ) : (
          <div id="module-status-content" className="divide-y divide-border-default">
            {modules.map((m) => (
              <div key={m.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${m.status === "active" ? "bg-buy" : "bg-sell"}`} />
                  <span className="text-xs text-txt-primary truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] text-txt-dim truncate">{m.detail}</span>
                  <Badge variant={m.status === "active" ? "live" : "error"} size="sm">
                    {m.status === "active" ? "Active" : "Error"}
                  </Badge>
                </div>
              </div>
            ))}

            {/* AI Provider row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full ${aiService?.status === "connected" ? "bg-buy" : aiService?.status === "no_key" ? "bg-hold" : "bg-sell"}`} />
                <span className="text-xs text-txt-primary">{aiProvider?.name ?? "AI Model"}</span>
                <span className="text-[9px] text-txt-dim font-mono">{aiProvider?.defaultModel}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] text-txt-dim truncate">{aiService?.detail ?? "Not checked"}</span>
                {aiService?.latencyMs ? (
                  <span className="text-[9px] text-txt-faint font-mono">{aiService.latencyMs}ms</span>
                ) : null}
                <Badge variant={aiService?.status === "connected" ? "live" : aiService?.status === "no_key" ? "warning" : "error"} size="sm">
                  {aiService?.status === "connected" ? "Connected" : aiService?.status === "no_key" ? "No Key" : "Error"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* API endpoints */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[9px] text-txt-faint font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${services.find(s => s.name === "SoSoValue API")?.status === "connected" ? "bg-buy" : "bg-sell"}`} />
              SoSoValue API
              {services.find(s => s.name === "SoSoValue API")?.latencyMs ? ` · ${services.find(s => s.name === "SoSoValue API")?.latencyMs}ms` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${services.find(s => s.name === "SoDEX")?.status === "connected" ? "bg-buy" : "bg-sell"}`} />
              SoDEX
              {services.find(s => s.name === "SoDEX")?.latencyMs ? ` · ${services.find(s => s.name === "SoDEX")?.latencyMs}ms` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${aiService?.status === "connected" ? "bg-buy" : "bg-hold"}`} />
              {aiProvider?.name ?? "AI"}
              {aiService?.latencyMs ? ` · ${aiService.latencyMs}ms` : ""}
            </span>
          </div>
          <span>Auto-refresh: 2min</span>
        </div>
      </Card>
    </div>
  );
}
