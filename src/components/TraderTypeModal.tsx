"use client";

import { useState, useEffect } from "react";
import type { TradingType, TradingTypeConfig } from "@/lib/types/trading-type";
import {
  TRADING_TYPE_LIST,
  TRADING_TYPES,
} from "@/lib/types/trading-type";

interface Props {
  onSelect: (type: TradingType) => void;
  onSkip?: () => void;
  purpose?: "signals" | "trading";
  currentType?: TradingType | null;
}

export default function TraderTypeModal({ onSelect, onSkip, purpose = "signals", currentType = null }: Props) {
  const [hoveredType, setHoveredType] = useState<TradingType | null>(null);
  const [selectedType, setSelectedType] = useState<TradingType | null>(currentType);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in after mount
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleSelect = (type: TradingType) => {
    setSelectedType(type);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(type);
    }, 300);
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const hoveredConfig = hoveredType ? TRADING_TYPES[hoveredType] : null;
  const isTrading = purpose === "trading";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop — solid dark, no transparency */}
      <div className="absolute inset-0 bg-[#070b14]" />

      {/* Content */}
      <div
        className={`relative z-10 w-full max-w-4xl mx-4 transition-all duration-500 ${
          isVisible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">
              {isTrading ? "Risk Profile Required" : "Personalize Your Experience"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-txt-primary tracking-tight">
            {isTrading ? "Choose Your Trade Profile" : "What's Your Trading Style?"}
          </h1>
          <p className="text-sm text-txt-secondary mt-2 max-w-lg mx-auto">
            {isTrading
              ? "Select the execution profile that will govern leverage, holding horizon, and risk limits before opening a position."
              : "SignalFlow adapts signals, risk parameters, and recommendations to match your strategy. Choose your style below."}
          </p>
        </div>

        {/* Type Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {TRADING_TYPE_LIST.map((config) => (
            <TypeCard
              key={config.id}
              config={config}
              isHovered={hoveredType === config.id}
              isSelected={selectedType === config.id}
              onHover={() => setHoveredType(config.id)}
              onLeave={() => setHoveredType(null)}
              onSelect={() => handleSelect(config.id)}
            />
          ))}
        </div>

        {/* Detail preview on hover */}
        <div className="h-20 flex items-center justify-center">
          {hoveredConfig ? (
            <div
              className="flex items-center gap-6 px-6 py-3 rounded-xl bg-card/60 border border-border-default"
              style={{ borderColor: `${hoveredConfig.color}30` }}
            >
              <DetailItem label="Timeframe" value={hoveredConfig.timeframe} color={hoveredConfig.color} />
              <DetailItem label="Hold Duration" value={hoveredConfig.holdDuration} color={hoveredConfig.color} />
              <DetailItem label="Max Leverage" value={`${hoveredConfig.maxLeverage}x`} color={hoveredConfig.color} />
              <DetailItem label="R:R Target" value={hoveredConfig.riskRewardTarget} color={hoveredConfig.color} />
              <DetailItem label="Min Confidence" value={`${hoveredConfig.minConfidence}%`} color={hoveredConfig.color} />
            </div>
          ) : (
            <p className="text-xs text-txt-faint">
              Hover over a style to see details
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          {!isTrading && onSkip ? (
            <>
              <button
                onClick={handleSkip}
                className="text-xs text-txt-dim hover:text-txt-secondary transition-colors underline underline-offset-2 cursor-pointer"
              >
                Skip — Show All Signals
              </button>
              <p className="text-[10px] text-txt-faint mt-1.5">
                You can change your style anytime from the signals page
              </p>
            </>
          ) : (
            <p className="text-[10px] text-hold">
              A Trade Profile is required before SignalFlow can open a position.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Type Card ──────────────────────────────────────────────

function TypeCard({
  config,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onSelect,
}: {
  config: TradingTypeConfig;
  isHovered: boolean;
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      className={`
        relative group flex flex-col items-center p-5 md:p-6 rounded-2xl border-2
        transition-all duration-300 cursor-pointer text-center
        ${isSelected
          ? "border-current scale-95 opacity-80"
          : isHovered
            ? "border-current scale-[1.02]"
            : "border-border-default hover:border-border-muted"
        }
        bg-card hover:bg-card/80
      `}
      style={{
        borderColor: isSelected || isHovered ? config.color : undefined,
        boxShadow: isHovered ? `0 0 30px ${config.color}15, 0 0 60px ${config.color}08` : undefined,
      }}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: `radial-gradient(circle at 50% 30%, ${config.color}10 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-3">
          <config.icon size={36} strokeWidth={1.5} style={{ color: config.color }} />
        </div>

        {/* Label */}
        <h3
          className="text-sm md:text-base font-bold mb-1 transition-colors"
          style={{ color: isHovered ? config.color : undefined }}
        >
          {config.label}
        </h3>

        {/* Timeframe */}
        <p
          className="text-[11px] font-mono font-semibold mb-2"
          style={{ color: config.color }}
        >
          {config.timeframe}
        </p>

        {/* Description */}
        <p className="text-[10px] text-txt-dim leading-relaxed hidden md:block">
          {config.description}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

// ── Detail Item ────────────────────────────────────────────

function DetailItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-txt-dim uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
