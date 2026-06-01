"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { BarChartIcon } from "@/components/ui/icons";
import { unwrapApiResponse } from "@/lib/api/client";

interface ETFDayData {
  date: string;
  total_net_inflow: number;
  total_value_traded: number;
  total_net_assets: number;
  cum_net_inflow: number;
}

interface ETFResponse {
  symbol: string;
  data: ETFDayData[];
  etfs: { ticker: string; name: string }[];
  totalInflow: number;
  cumInflow: number;
  latestAUM: number;
}

function fmtUSD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function BarChart({ data }: { data: ETFDayData[] }) {
  if (!data.length) return null;

  const reversed = [...data].reverse();
  const maxAbs = Math.max(...reversed.map((d) => Math.abs(d.total_net_inflow)));
  const barWidth = 100 / reversed.length;

  return (
    <div className="relative h-40 flex items-end gap-px">
      {reversed.map((d) => {
        const height = maxAbs > 0 ? (Math.abs(d.total_net_inflow) / maxAbs) * 100 : 0;
        const isPositive = d.total_net_inflow >= 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex items-end justify-center group relative"
            style={{ minWidth: `${barWidth}%` }}
          >
            <div
              className="w-full rounded-t-sm transition-all duration-200 group-hover:opacity-80"
              style={{
                height: `${Math.max(2, height)}%`,
                backgroundColor: isPositive ? "#00ff88" : "#ff4444",
                opacity: 0.7 + (height / 100) * 0.3,
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-[#0B1020] border border-[#1E293B] rounded-lg px-3 py-2 text-[10px] whitespace-nowrap shadow-xl">
                <p className="text-txt-muted font-mono">{d.date}</p>
                <p className={`font-bold ${isPositive ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {isPositive ? "+" : ""}{fmtUSD(d.total_net_inflow)}
                </p>
                <p className="text-txt-faint">AUM: {fmtUSD(d.total_net_assets)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ETFFlowChart({ symbol = "BTC" }: { symbol?: string }) {
  const [data, setData] = useState<ETFResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/etf-flow?symbol=${symbol}&limit=30`)
      .then((r) => r.json())
      .then(unwrapApiResponse<ETFResponse>)
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">Failed to load ETF data: {error ?? "No data"}</p>
      </Card>
    );
  }

  if (!data.data || data.data.length === 0) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <span className="text-txt-secondary"><BarChartIcon size={16} /></span>
            <h3 className="text-sm font-semibold text-txt-primary">{symbol} ETF Flows</h3>
          </div>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-txt-muted">No ETF flow data available</p>
          <p className="text-[10px] text-txt-faint mt-1">Data will appear when SoSoValue API is connected</p>
        </div>
      </Card>
    );
  }

  const last7 = data.data.slice(0, 7);
  const weeklyInflow = last7.reduce((s, d) => s + d.total_net_inflow, 0);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-txt-secondary"><BarChartIcon size={16} /></span>
            <h3 className="text-sm font-semibold text-txt-primary">{symbol} ETF Flows</h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {data.etfs.slice(0, 5).map((etf) => (
              <span
                key={etf.ticker}
                className="text-[8px] text-txt-faint bg-elevated px-1.5 py-0.5 rounded font-mono"
              >
                {etf.ticker}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4 pb-2">
        <BarChart data={data.data} />
        {/* Date labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-txt-faint font-mono">
            {data.data.length > 0 ? data.data[data.data.length - 1].date : ""}
          </span>
          <span className="text-[8px] text-txt-faint font-mono">
            {data.data.length > 0 ? data.data[0].date : ""}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-elevated/30 rounded-lg p-2.5">
          <p className="text-[9px] text-txt-faint uppercase tracking-wider">Weekly Flow</p>
          <p className={`text-sm font-bold font-mono mt-0.5 ${weeklyInflow >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
            {weeklyInflow >= 0 ? "+" : ""}{fmtUSD(weeklyInflow)}
          </p>
        </div>
        <div className="bg-elevated/30 rounded-lg p-2.5">
          <p className="text-[9px] text-txt-faint uppercase tracking-wider">Cumulative</p>
          <p className="text-sm font-bold font-mono mt-0.5 text-txt-primary">
            {fmtUSD(data.cumInflow)}
          </p>
        </div>
        <div className="bg-elevated/30 rounded-lg p-2.5">
          <p className="text-[9px] text-txt-faint uppercase tracking-wider">Total AUM</p>
          <p className="text-sm font-bold font-mono mt-0.5 text-txt-primary">
            {fmtUSD(data.latestAUM)}
          </p>
        </div>
      </div>
    </Card>
  );
}
