"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

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

export default function MacroSurprise({ eventName = "Federal Funds Rate" }: Props) {
  const [data, setData] = useState<MacroEventItem[]>([]);
  const [upcoming, setUpcoming] = useState<MacroCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/macro?history=true&event=${encodeURIComponent(eventName)}`, { cache: "no-store" })
      .then((r) => r.json())
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
          <span className="text-xs">📊</span>
          <h3 className="text-sm font-semibold text-txt-primary">Macro Surprises</h3>
        </div>
      </div>

      <div className="divide-y divide-border-default">
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
              {upcoming.flatMap((day) => (day.events ?? []).map((event) => ({ date: day.date, event }))).slice(0, 5).map((item, i) => (
                <div key={`${item.date}-${item.event}-${i}`} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-elevated/20">
                  <span className="min-w-[70px] font-mono text-[10px] text-txt-faint">{item.date}</span>
                  <span className="text-[11px] font-medium text-txt-primary">{item.event}</span>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="px-2 py-2 text-center text-xs text-txt-muted">Macro calendar unavailable</p>
              )}
            </div>
          </div>
        ) : (
          data.slice(0, 8).map((item, i) => {
            const actual = parseFloat(item.actual);
            const forecast = parseFloat(item.forecast);
            const surprise = !isNaN(actual) && !isNaN(forecast) && forecast !== 0
              ? actual - forecast
              : null;
            const isPositive = surprise !== null && surprise > 0;
            const isNegative = surprise !== null && surprise < 0;

            return (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-[10px] text-txt-faint font-mono min-w-[70px]">{item.date}</span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[8px] text-txt-faint uppercase">Actual</p>
                    <p className="text-[11px] font-mono text-txt-primary">{item.actual || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-txt-faint uppercase">Forecast</p>
                    <p className="text-[11px] font-mono text-txt-secondary">{item.forecast || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-txt-faint uppercase">Surprise</p>
                    {surprise !== null ? (
                      <Badge variant={isPositive ? "buy" : isNegative ? "sell" : "muted"} size="sm">
                        {isPositive ? "+" : ""}{surprise.toFixed(2)}
                      </Badge>
                    ) : (
                      <span className="text-[11px] font-mono text-txt-faint">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
