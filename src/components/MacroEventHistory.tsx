"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { TrendUpIcon } from "@/components/ui/icons";

interface MacroHistoryEntry {
  date: string;
  actual: string;
  forecast: string;
  previous: string;
}

function parseVal(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[%,$KBM\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function fmtVal(s: string): string {
  if (!s) return "—";
  return s;
}

function HistoryChart({ data }: { data: MacroHistoryEntry[] }) {
  const reversed = useMemo(() => [...data].reverse(), [data]);

  const values = useMemo(() => {
    const allVals = reversed.flatMap((d) => {
      const vals = [parseVal(d.actual), parseVal(d.forecast), parseVal(d.previous)];
      return vals.filter((v): v is number => v !== null);
    });
    if (allVals.length === 0) return { min: 0, max: 100 };
    return { min: Math.min(...allVals), max: Math.max(...allVals) };
  }, [reversed]);

  const range = values.max - values.min || 1;
  const chartHeight = 120;

  const toY = (val: number) => {
    return chartHeight - ((val - values.min) / range) * (chartHeight - 20);
  };

  const actualPoints = reversed
    .map((d, i) => {
      const v = parseVal(d.actual);
      if (v === null) return null;
      const x = (i / (reversed.length - 1 || 1)) * 100;
      return { x, y: toY(v), val: v, date: d.date };
    })
    .filter((p): p is { x: number; y: number; val: number; date: string } => p !== null);

  const forecastPoints = reversed
    .map((d, i) => {
      const v = parseVal(d.forecast);
      if (v === null) return null;
      const x = (i / (reversed.length - 1 || 1)) * 100;
      return { x, y: toY(v), val: v, date: d.date };
    })
    .filter((p): p is { x: number; y: number; val: number; date: string } => p !== null);

  const prevPoints = reversed
    .map((d, i) => {
      const v = parseVal(d.previous);
      if (v === null) return null;
      const x = (i / (reversed.length - 1 || 1)) * 100;
      return { x, y: toY(v), val: v, date: d.date };
    })
    .filter((p): p is { x: number; y: number; val: number; date: string } => p !== null);

  const toPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  };

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={chartHeight * pct}
              x2="100"
              y2={chartHeight * pct}
              stroke="#1E293B"
              strokeWidth="0.3"
            />
          ))}

          {/* Previous line (gray dashed) */}
          {prevPoints.length > 1 && (
            <path
              d={toPath(prevPoints)}
              fill="none"
              stroke="#64748b"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Forecast line (blue) */}
          {forecastPoints.length > 1 && (
            <path
              d={toPath(forecastPoints)}
              fill="none"
              stroke="#00d4ff"
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Actual line (green/red based on beat/miss) */}
          {actualPoints.length > 1 && (
            <path
              d={toPath(actualPoints)}
              fill="none"
              stroke="#00ff88"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Dots for actual */}
          {actualPoints.map((p, i) => (
            <circle
              key={i}
              cx={p!.x}
              cy={p!.y}
              r="1"
              fill="#00ff88"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-[#00ff88] rounded" />
          <span className="text-txt-muted">Actual</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-[#00d4ff] rounded" />
          <span className="text-txt-muted">Forecast</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-[#64748b] rounded border-dashed" />
          <span className="text-txt-muted">Previous</span>
        </span>
      </div>

      {/* Recent data table */}
      <div className="space-y-1">
        {reversed.slice(-5).reverse().map((entry) => {
          const actual = parseVal(entry.actual);
          const forecast = parseVal(entry.forecast);
          const beat = actual !== null && forecast !== null ? actual > forecast : null;

          return (
            <div key={entry.date} className="flex items-center gap-2 text-[9px] font-mono px-1 py-0.5 rounded hover:bg-elevated/20">
              <span className="text-txt-faint w-16">{entry.date}</span>
              <span className={`flex-1 text-right ${beat === true ? "text-[#00ff88]" : beat === false ? "text-[#ff4444]" : "text-txt-secondary"}`}>
                {fmtVal(entry.actual)}
              </span>
              <span className="flex-1 text-right text-[#00d4ff]">{fmtVal(entry.forecast)}</span>
              <span className="flex-1 text-right text-txt-faint">{fmtVal(entry.previous)}</span>
              {beat !== null && (
                <span className={`text-[8px] ${beat ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {beat ? "▲" : "▼"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MacroEventHistory({ eventName = "Federal Funds Rate" }: { eventName?: string }) {
  const [data, setData] = useState<MacroHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(eventName);

  const commonEvents = [
    "Federal Funds Rate",
    "CPI",
    "Nonfarm Payrolls",
    "GDP",
    "Unemployment Rate",
    "Retail Sales",
    "PPI",
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/macro?history=true&event=${encodeURIComponent(selectedEvent)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          if (json.error) setError(json.error);
          else setData(json.history ?? []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedEvent]);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-txt-secondary"><TrendUpIcon size={16} /></span>
            <h3 className="text-sm font-semibold text-txt-primary">Macro History</h3>
          </div>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="text-[10px] bg-elevated border border-border-default rounded px-2 py-1 text-txt-primary font-mono focus:border-accent/50 outline-none cursor-pointer"
          >
            {commonEvents.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <p className="text-xs text-sell">{error}</p>
        ) : data.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-txt-muted">No history data for {selectedEvent}</p>
            <p className="text-[10px] text-txt-faint mt-1">Data will appear when SoSoValue API is connected</p>
          </div>
        ) : (
          <HistoryChart data={data} />
        )}
      </div>
    </Card>
  );
}
