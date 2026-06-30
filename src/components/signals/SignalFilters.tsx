"use client";

import type { SignalAction } from "@/lib/types/signal";

export type SortOption = "confidence" | "change" | "newest" | "pair";
export type ViewMode = "cards" | "compact";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: SignalAction | "ALL";
  onTypeFilterChange: (v: SignalAction | "ALL") => void;
  confidenceFilter: number;
  onConfidenceFilterChange: (v: number) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

const typeOptions: { label: string; value: SignalAction | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "LONG", value: "LONG" },
  { label: "NO TRADE", value: "HOLD" },
  { label: "SHORT", value: "SHORT" },
];

const confidenceOptions: { label: string; value: number }[] = [
  { label: "All", value: 0 },
  { label: "70%+", value: 70 },
  { label: "80%+", value: 80 },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Confidence", value: "confidence" },
  { label: "Change %", value: "change" },
  { label: "Newest", value: "newest" },
  { label: "Pair", value: "pair" },
];

export default function SignalFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  confidenceFilter,
  onConfidenceFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <div className="signals-glass-card mb-5 flex flex-col gap-2 p-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-dim"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search pairs..."
          className="w-full border pl-9 pr-3 py-2 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none"
        />
      </div>

      {/* Type filter */}
      <div className="overflow-x-auto scrollbar-none">
        <div className="glass-pill inline-flex min-w-full items-center gap-1 p-1 sm:min-w-0 sm:flex">
        {typeOptions.map((opt) => {
          const isActive = typeFilter === opt.value;
          let activeColor = "text-accent";
          if (opt.value === "LONG") activeColor = "text-buy";
          else if (opt.value === "SHORT") activeColor = "text-sell";
          else if (opt.value === "HOLD") activeColor = "text-hold";

          return (
            <button
              key={opt.value}
              onClick={() => onTypeFilterChange(opt.value)}
              className={`
                rounded-[35px] px-2.5 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap
                ${isActive ? `bg-white/[0.08] ${activeColor}` : "text-txt-muted hover:text-txt-secondary"}
              `}
            >
              {opt.label}
            </button>
          );
        })}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[390px]:grid-cols-2 sm:flex gap-2">
        {/* Confidence filter */}
        <select
          value={confidenceFilter}
          onChange={(e) => onConfidenceFilterChange(Number(e.target.value))}
          className="w-full cursor-pointer border px-2.5 py-2 text-[10px] text-txt-secondary focus:outline-none"
        >
          {confidenceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === 0 ? "All Confidence" : `${opt.value}%+ Confidence`}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full cursor-pointer border px-2.5 py-2 text-[10px] text-txt-secondary focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="glass-pill flex items-center justify-center gap-0.5 p-1 min-[390px]:col-span-2 sm:col-span-1">
          <button
            onClick={() => onViewModeChange("cards")}
            className={`rounded-[35px] p-1.5 ${viewMode === "cards" ? "bg-white/[0.08] text-accent" : "text-txt-muted hover:text-txt-secondary"}`}
            title="Card view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("compact")}
            className={`rounded-[35px] p-1.5 ${viewMode === "compact" ? "bg-white/[0.08] text-accent" : "text-txt-muted hover:text-txt-secondary"}`}
            title="Compact view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
