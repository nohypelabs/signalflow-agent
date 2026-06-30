"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry, LogFilter, LogType } from "@/lib/hooks/useSignalLog";
import Card from "@/components/ui/Card";

interface Props {
  entries: LogEntry[];
  status: "live" | "reconnecting" | "polling";
  filter: LogFilter;
  onFilterChange: (f: LogFilter) => void;
}

const TYPE_COLORS: Record<LogType, string> = {
  DATA: "#6B7280",
  SIGNAL: "#00E5A8",
  RECALC: "#94A3B8",
  WARNING: "#FBBF24",
  ERROR: "#F87171",
};

const FILTERS: { key: LogFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "signal", label: "Signal Only" },
  { key: "errors", label: "Errors" },
];

const STATUS_META: Record<string, { label: string; color: string; pulse: boolean }> = {
  live: { label: "LIVE", color: "#00E5A8", pulse: true },
  reconnecting: { label: "reconnecting...", color: "#FBBF24", pulse: false },
  polling: { label: "polling", color: "#94A3B8", pulse: false },
};

export default function SignalLogFeed({ entries, status, filter, onFilterChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showPill, setShowPill] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
    setShowPill(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
    setShowPill(false);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [entries, autoScroll]);

  const statusMeta = STATUS_META[status];

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-txt-secondary">Signal Log</p>
          <h2 className="mt-1 text-sm font-semibold text-txt-primary">Real-time pipeline events</h2>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`rounded-[35px] px-2.5 py-1 text-[9px] font-semibold transition-colors ${
                filter === f.key
                  ? "border border-accent-dim bg-accent-muted text-accent"
                  : "border border-white/10 text-txt-secondary hover:border-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusMeta.pulse ? "animate-pulse" : ""}`}
            style={{ backgroundColor: statusMeta.color }}
          />
          <span className="font-mono text-[9px] font-semibold" style={{ color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[280px] overflow-y-auto bg-black/20 p-3 font-mono text-[12px] leading-[1.6]"
        >
          {entries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-txt-secondary text-[11px]">
              Waiting for pipeline events...
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="log-entry-fade-in py-px"
                style={{ color: TYPE_COLORS[entry.type] }}
              >
                <span style={{ color: "#6B7280" }}>[{entry.ts}]</span>{" "}
                {entry.emoji ? `${entry.emoji} ` : ""}
                {entry.msg}
              </div>
            ))
          )}
        </div>

        {showPill && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="glass-control absolute bottom-3 left-1/2 -translate-x-1/2 rounded-[35px] px-3 py-1 text-[10px] font-semibold text-accent transition-colors"
          >
            ▼ new entries
          </button>
        )}
      </div>
    </Card>
  );
}
