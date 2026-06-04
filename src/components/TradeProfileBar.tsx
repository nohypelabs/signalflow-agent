"use client";

import TradingTypeIcon from "@/components/TradingTypeIcon";
import type { TradingType } from "@/lib/types/trading-type";
import { TRADING_TYPES } from "@/lib/types/trading-type";

interface Props {
  tradingType: TradingType | null;
  onReview: () => void;
}

export default function TradeProfileBar({ tradingType, onReview }: Props) {
  const config = tradingType ? TRADING_TYPES[tradingType] : null;

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-border-default bg-inset/35 px-3 py-2"
      style={config ? { borderBottomColor: `${config.color}35` } : undefined}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-default bg-elevated/35 text-txt-secondary">
        {config ? <TradingTypeIcon type={config.id} size={13} /> : <span className="text-xs text-hold">!</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-bold uppercase tracking-wider text-txt-faint">
          Active Trade Profile
        </p>
        {config ? (
          <>
            <p className="truncate text-[11px] font-bold" style={{ color: config.color }}>
              {config.label} · {config.timeframe}
            </p>
            <p className="truncate text-[9px] text-txt-dim">
              {config.holdDuration} · max {config.maxLeverage}x · R:R {config.riskRewardTarget}
            </p>
          </>
        ) : (
          <p className="text-[10px] font-semibold text-hold">Required before execution</p>
        )}
      </div>
      <button
        type="button"
        onClick={onReview}
        className={`shrink-0 cursor-pointer rounded-md border px-2 py-1.5 text-[9px] font-semibold transition-colors ${
          tradingType
            ? "border-border-default bg-card/60 text-txt-dim hover:border-accent/35 hover:text-accent"
            : "border-hold/40 bg-hold/10 text-hold hover:bg-hold/20"
        }`}
      >
        {tradingType ? "Change" : "Choose"}
      </button>
    </div>
  );
}
