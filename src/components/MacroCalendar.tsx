"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { ActivityIcon, BarChartIcon, BriefcaseIcon, ChartBarIcon, DataSourceIcon, DocumentIcon } from "@/components/ui/icons";

interface MacroDay {
  date: string;
  events: string[];
}

interface MacroResponse {
  events: MacroDay[];
  upcoming: MacroDay[];
  today: MacroDay[];
  totalEvents: number;
}

function importanceColor(events: string[]): string {
  const text = events.join(" ").toLowerCase();
  if (text.includes("fed") || text.includes("fomc") || text.includes("interest rate")) return "#ff4444";
  if (text.includes("cpi") || text.includes("gdp") || text.includes("employment")) return "#ff8800";
  if (text.includes("retail") || text.includes("pmi") || text.includes("sentiment")) return "#00d4ff";
  return "#64748b";
}

function eventIcon(event: string): "finance" | "momentum" | "gdp" | "jobs" | "retail" | "energy" | "treasury" | "calendar" {
  const t = event.toLowerCase();
  if (t.includes("fed") || t.includes("fomc")) return "finance";
  if (t.includes("cpi") || t.includes("inflation")) return "momentum";
  if (t.includes("gdp")) return "gdp";
  if (t.includes("employment") || t.includes("nonfarm") || t.includes("job")) return "jobs";
  if (t.includes("retail")) return "retail";
  if (t.includes("oil") || t.includes("crude")) return "energy";
  if (t.includes("treasury") || t.includes("bond")) return "treasury";
  return "calendar";
}

function EventIcon({ type }: { type: ReturnType<typeof eventIcon> }) {
  if (type === "finance") return <BriefcaseIcon size={12} />;
  if (type === "momentum") return <ChartBarIcon size={12} />;
  if (type === "gdp") return <BarChartIcon size={12} />;
  if (type === "jobs") return <DocumentIcon size={12} />;
  if (type === "retail") return <DataSourceIcon size={12} />;
  if (type === "energy") return <ActivityIcon size={12} />;
  if (type === "treasury") return <BriefcaseIcon size={12} />;
  return <DocumentIcon size={12} />;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";

  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10);
}

export default function MacroCalendar() {
  const [data, setData] = useState<MacroResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/macro")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          if (json.error) setError(json.error);
          else setData(json);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">Failed to load macro data: {error ?? "No data"}</p>
      </Card>
    );
  }

  if (!data.events || data.events.length === 0) {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <span className="text-txt-secondary"><DocumentIcon size={16} /></span>
            <h3 className="text-sm font-semibold text-txt-primary">Macro Calendar</h3>
          </div>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-txt-muted">No macro events available</p>
          <p className="text-[10px] text-txt-faint mt-1">Data will appear when SoSoValue API is connected</p>
        </div>
      </Card>
    );
  }

  const displayDays = showAll ? data.events : data.events.filter((d) => !isPast(d.date)).slice(0, 8);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-txt-secondary"><DocumentIcon size={16} /></span>
            <h3 className="text-sm font-semibold text-txt-primary">Macro Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            {data.today.length > 0 && (
              <Badge variant="live" size="sm">
                {data.today.reduce((s, d) => s + d.events.length, 0)} today
              </Badge>
            )}
            <span className="text-[9px] text-txt-faint font-mono">{data.totalEvents} events</span>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="divide-y divide-border-default">
        {displayDays.map((day) => (
          <div
            key={day.date}
            className={`px-4 py-2.5 transition-colors ${
              isToday(day.date) ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-elevated/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-[80px] pt-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isToday(day.date) ? "text-accent" : isPast(day.date) ? "text-txt-faint" : "text-txt-muted"
                }`}>
                  {fmtDate(day.date)}
                </span>
              </div>
              <div className="flex-1 space-y-1">
                {day.events.map((event, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded bg-elevated/20 flex items-center justify-center text-txt-secondary"><EventIcon type={eventIcon(event)} /></span>
                    <span className="text-[11px] text-txt-secondary leading-tight">{event}</span>
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: importanceColor([event]) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {data.events.length > 8 && (
        <div className="px-4 py-2 border-t border-border-default">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            {showAll ? "Show upcoming only" : `Show all ${data.events.length} days`}
          </button>
        </div>
      )}
    </Card>
  );
}
