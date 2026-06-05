"use client";

import type { DrawingTool } from "@/lib/chart-drawings/types";

interface Props {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClear: () => void;
  onToggleHidden: () => void;
  hidden: boolean;
  drawingCount: number;
  pendingFirstClick: boolean;
}

const tools: { id: DrawingTool; label: string; icon: React.ReactNode }[] = [
  {
    id: "select",
    label: "Select",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    ),
  },
  {
    id: "measure",
    label: "Measure",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h5M17 12h5" /><path d="M7 12l3-3-3-3" /><path d="M17 12l-3 3 3 3" /><circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "horizontal_line",
    label: "Horizontal Line",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    id: "trendline",
    label: "Trendline",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    id: "fib_retracement",
    label: "Fibonacci",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="4" x2="21" y2="4" /><line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="19" x2="21" y2="19" />
        <text x="1" y="7" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">F</text>
      </svg>
    ),
  },
];

export default function ChartDrawingToolbar({
  activeTool,
  onSelectTool,
  onClear,
  onToggleHidden,
  hidden,
  drawingCount,
  pendingFirstClick,
}: Props) {
  return (
    <div className="absolute top-2 left-2 z-30 flex flex-col items-center gap-0.5 bg-[#0B1020]/95 backdrop-blur border border-border-default rounded-md p-0.5 shadow-xl">
      <div className="text-[7px] text-txt-faint font-mono tracking-wider mb-0.5 select-none">DRAW</div>
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          title={t.label}
          className={`relative p-1 rounded transition-all cursor-pointer ${
            activeTool === t.id
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-txt-dim hover:text-txt-secondary hover:bg-elevated/60 border border-transparent"
          }`}
        >
          {t.icon}
          {activeTool === t.id && pendingFirstClick && (
            <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-accent animate-pulse" />
          )}
        </button>
      ))}

      {/* Separator */}
      <div className="h-px w-5 bg-border-default my-0.5" />

      {/* Hide toggle */}
      <button
        onClick={onToggleHidden}
        title={hidden ? "Show drawings" : "Hide drawings"}
        className={`p-1 rounded transition-all cursor-pointer ${
          hidden
            ? "text-hold bg-hold/10 border border-hold/20"
            : "text-txt-dim hover:text-txt-secondary hover:bg-elevated/60 border border-transparent"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {hidden ? (
            <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
          ) : (
            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
          )}
        </svg>
      </button>

      {/* Clear */}
      {drawingCount > 0 && (
        <button
          onClick={onClear}
          title={`Clear ${drawingCount} drawing${drawingCount !== 1 ? "s" : ""}`}
          className="p-1 rounded transition-all cursor-pointer text-txt-dim hover:text-sell hover:bg-sell/10 border border-transparent"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {/* Pending instruction - below the toolbar */}
      {pendingFirstClick && (
        <span className="text-[8px] text-accent mt-0.5 animate-pulse whitespace-nowrap text-center leading-none">
          2nd pt
        </span>
      )}
    </div>
  );
}
