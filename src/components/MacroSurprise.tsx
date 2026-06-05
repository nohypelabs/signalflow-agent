"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { Activity } from "lucide-react";
import { unwrapApiResponse } from "@/lib/api/client";

interface MacroEventItem {
  date: string;
  actual: string;
  forecast: string;
  previous: string;
}

interface MacroCalendarDay {
  date: string;
  events?: string[];
}

interface Props {
  eventName?: string;
}

export default function MacroSurprise({ eventName = "CPI (MoM)" }: Props) {
  const [data, setData] = useState<MacroEventItem[]>([]);
  const [upcoming, setUpcoming] = useState<MacroCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/macro?history=true&event=${encodeURIComponent(eventName)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(unwrapApiResponse<{ history?: MacroEventItem[]; upcoming?: MacroCalendarDay[]; events?: MacroCalendarDay[] }>)
      .then((d) => {
        if (cancelled) return;
        setData(d.history ?? []);
        setUpcoming(d.upcoming ?? d.events ?? []);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventName]);

  if (loading) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-32 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="table-row" className="h-8 mb-1" />
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">{error}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-info" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-txt-primary">Macro Surprises</h3>
          <Badge variant="info" size="sm">{eventName}</Badge>
        </div>
      </div>

      <div>
        {data.length === 0 ? (
          <div className="p-4">
            <div className="rounded-lg border border-hold-dim bg-hold-muted/20 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-hold">History pending</span>
                <Badge variant="hold" size="sm">Calendar</Badge>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-txt-secondary">
                SoSoValue did not return surprise history for {eventName}. Showing upcoming macro calendar instead.
              </p>
            </div>
            <div className="mt-3 space-y-1">
              {upcoming.flatMap((day) => (day.events ?? []).map((event) => ({ date: day.date, event }))).slice(0, 6).map((item, i) => (
                <div key={`${item.date}-${item.event}-${i}`} className="flex items-center gap-3 rounded px-2 py-1 hover:bg-elevated/20 transition-colors">
                  <span className="min-w-[68px] font-mono text-[10px] text-txt-faint tabular-nums">{item.date}</span>
                  <span className="text-[11px] font-medium text-txt-primary flex-1 truncate">{item.event}</span>
                  <span className="text-[8px] text-txt-dim">→</span>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="px-2 py-2 text-center text-xs text-txt-muted">Macro calendar unavailable</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Summary for latest surprise */}
            {data.length > 0 && (() => {
              const latest = data[0];
              const a = parseFloat(latest.actual);
              const f = parseFloat(latest.forecast);
              const s = !isNaN(a) && !isNaN(f) && f !== 0 ? a - f : null;
              const sTone = s !== null && s > 0 ? "text-buy" : s !== null && s < 0 ? "text-sell" : "text-txt-muted";
              return (
                <div className="px-4 py-1.5 bg-elevated/10 flex items-center justify-between text-xs border-b border-border-default/50">
                  <span className="text-txt-muted">Latest surprise</span>
                  <span className={`font-mono font-semibold tabular-nums ${sTone}`}>
                    {s !== null ? `${s > 0 ? "+" : ""}${s.toFixed(2)}` : "—"} <span className="text-[9px] text-txt-dim">({latest.date})</span>
                  </span>
                </div>
              );
            })()}

            {data.slice(0, 6).map((item, i) => {
            const actual = parseFloat(item.actual);
            const forecast = parseFloat(item.forecast);
            const previous = parseFloat(item.previous);
            const surprise = !isNaN(actual) && !isNaN(forecast) && forecast !== 0
              ? actual - forecast
              : null;
            const isPositive = surprise !== null && surprise > 0;
            const isNegative = surprise !== null && surprise < 0;
            const surprisePct = surprise !== null && !isNaN(forecast) && forecast !== 0
              ? ((surprise / Math.abs(forecast)) * 100)
              : null;

            const beatText = surprise !== null ? (isPositive ? "Beat" : "Miss") : "";
            const surpriseColor = isPositive ? "text-buy" : isNegative ? "text-sell" : "text-txt-muted";

            // Simple visual bar for surprise magnitude (scaled roughly)
            const barWidth = surprise !== null ? Math.min(100, Math.abs(surprise) * 80) : 0;
            const barColor = isPositive ? "bg-buy" : "bg-sell";

            return (
              <div key={i} className="px-4 py-2 flex items-center gap-3 border-b border-border-default/50 last:border-b-0 hover:bg-elevated/10">
                <span className="text-[10px] text-txt-faint font-mono min-w-[68px] shrink-0">{item.date}</span>

                <div className="flex-1 grid grid-cols-4 gap-2 text-xs items-center">
                  <div>
                    <div className="text-[7px] text-txt-faint uppercase tracking-wider">Actual</div>
                    <div className="font-mono text-[11px] font-semibold text-txt-primary tabular-nums">{item.actual || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[7px] text-txt-faint uppercase tracking-wider">Forecast</div>
                    <div className="font-mono text-[11px] text-txt-secondary tabular-nums">{item.forecast || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[7px] text-txt-faint uppercase tracking-wider">Prev</div>
                    <div className="font-mono text-[10px] text-txt-dim tabular-nums">{item.previous || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[7px] text-txt-faint uppercase tracking-wider">Surprise</div>
                    {surprise !== null ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Badge variant={isPositive ? "buy" : isNegative ? "sell" : "muted"} size="sm" className="font-mono">
                          {isPositive ? "+" : ""}{surprise.toFixed(2)}
                          {surprisePct !== null && ` (${surprisePct > 0 ? "+" : ""}${surprisePct.toFixed(0)}%)`}
                        </Badge>
                        {beatText && (
                          <span className={`text-[8px] font-bold ${surpriseColor}`}>{beatText}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-txt-faint">—</span>
                    )}
                  </div>
                </div>

                {/* Visual surprise bar */}
                {surprise !== null && (
                  <div className="w-12 shrink-0">
                    <div className="h-1.5 w-full bg-border-default/30 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${barColor}`}
                        style={{ width: `${barWidth}%`, marginLeft: isNegative ? `${100 - barWidth}%` : '0' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>
    </Card>
  );
}
