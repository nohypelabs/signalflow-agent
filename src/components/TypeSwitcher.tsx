"use client";

import { useState, useRef, useEffect } from "react";
import type { TradingType } from "@/lib/types/trading-type";
import {
  TRADING_TYPES,
  TRADING_TYPE_LIST,
  saveTradingType,
  clearTradingType,
} from "@/lib/types/trading-type";
import TradingTypeIcon from "@/components/TradingTypeIcon";
import { DataSourceIcon } from "@/components/ui/icons";

interface Props {
  currentType: TradingType | null;
  onTypeChange: (type: TradingType | null) => void;
  compact?: boolean;
}

export default function TypeSwitcher({ currentType, onTypeChange, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<"left" | "right">("right");
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !dropdownRef.current) return;
    const rafId = window.requestAnimationFrame(() => {
      const rect = dropdownRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownAlign(rect.left < 8 ? "left" : "right");
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [open]);

  const current = currentType ? TRADING_TYPES[currentType] : null;

  const handleSelect = (type: TradingType | null) => {
    if (type) {
      saveTradingType(type);
    } else {
      clearTradingType();
    }
    onTypeChange(type);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
          ${current
            ? "border-border-strong bg-card hover:bg-elevated"
            : "border-border-default bg-card/50 hover:bg-card text-txt-dim"
          }
        `}
        style={current ? { borderColor: `${current.color}40` } : undefined}
      >
        {current ? (
          <>
            <span className="text-sm text-txt-secondary"><TradingTypeIcon type={current.id} size={13} /></span>
            {!compact && (
              <>
                <span className="text-xs font-semibold" style={{ color: current.color }}>
                  {current.label}
                </span>
                <span className="text-[10px] text-txt-dim font-mono">{current.timeframe}</span>
              </>
            )}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {!compact && <span className="text-xs">All Types</span>}
          </>
        )}
        <svg
          className={`w-3 h-3 text-txt-dim transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute top-full mt-1 w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-border-default bg-card overflow-hidden z-50 ${
            dropdownAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-default">
            <p className="text-[10px] text-txt-dim uppercase tracking-wider font-semibold">
              Trading Style
            </p>
          </div>

          {/* Options */}
          <div className="py-1">
            {TRADING_TYPE_LIST.map((config) => (
              <button
                key={config.id}
                onClick={() => handleSelect(config.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                  ${currentType === config.id
                    ? "bg-inset"
                    : "hover:bg-inset/50"
                  }
                `}
              >
                <span className="text-txt-secondary w-5 h-5 rounded bg-elevated/30 border border-border-default flex items-center justify-center shrink-0">
                  <TradingTypeIcon type={config.id} size={11} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                    <span className="text-[10px] text-txt-dim font-mono">
                      {config.timeframe}
                    </span>
                  </div>
                  <p className="text-[10px] text-txt-faint truncate">
                    {config.holdDuration} · max {config.maxLeverage}x
                  </p>
                </div>
                {currentType === config.id && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* All Types option */}
          <div className="border-t border-border-default py-1">
            <button
              onClick={() => handleSelect(null)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                ${!currentType ? "bg-inset" : "hover:bg-inset/50"}
              `}
            >
              <span className="text-txt-secondary w-5 h-5 rounded bg-elevated/30 border border-border-default flex items-center justify-center shrink-0">
                <DataSourceIcon size={11} />
              </span>
              <div className="flex-1">
                <span className="text-xs font-semibold text-txt-secondary">All Types</span>
                <p className="text-[10px] text-txt-faint">Show all signals unfiltered</p>
              </div>
              {!currentType && (
                <div className="w-2 h-2 rounded-full bg-txt-secondary shrink-0" />
              )}
            </button>
          </div>

          {/* Reopen onboarding */}
          <div className="border-t border-border-default px-3 py-2">
            <button
              onClick={() => {
                setOpen(false);
                // Dispatch custom event to reopen modal
                window.dispatchEvent(new CustomEvent("reopen-trader-type-modal"));
              }}
              className="text-[10px] text-txt-dim hover:text-txt-secondary transition-colors underline underline-offset-2"
            >
              Change style with onboarding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
