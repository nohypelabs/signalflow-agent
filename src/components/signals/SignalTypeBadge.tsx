"use client";

import type { SignalAction, SignalActionV2 } from "@/lib/types/signal";

type AnyAction = SignalAction | SignalActionV2;

const strongLong = {
  bg: "bg-[#00ff88]/20",
  border: "border-[#00ff88]/40",
  text: "text-[#00ff88]",
  label: "STRONG LONG",
};
const long = {
  bg: "bg-buy-muted",
  border: "border-buy-dim",
  text: "text-buy",
  label: "LONG",
};
const weakLong = {
  bg: "bg-[#00ff88]/10",
  border: "border-[#00ff88]/20",
  text: "text-[#00ff88]/70",
  label: "WEAK LONG",
};
const hold = {
  bg: "bg-hold-muted",
  border: "border-hold-dim",
  text: "text-hold",
  label: "NO TRADE",
};
const weakShort = {
  bg: "bg-[#ff4444]/10",
  border: "border-[#ff4444]/20",
  text: "text-[#ff4444]/70",
  label: "WEAK SHORT",
};
const shortStyle = {
  bg: "bg-sell-muted",
  border: "border-sell-dim",
  text: "text-sell",
  label: "SHORT",
};
const strongShort = {
  bg: "bg-[#ff4444]/20",
  border: "border-[#ff4444]/40",
  text: "text-[#ff4444]",
  label: "STRONG SHORT",
};

const actionStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  // V2 engine keys (LONG/SHORT)
  STRONG_LONG: strongLong,
  LONG: long,
  WEAK_LONG: weakLong,
  HOLD: hold,
  WEAK_SHORT: weakShort,
  SHORT: shortStyle,
  STRONG_SHORT: strongShort,
  // Legacy keys (BUY/SELL) — backward compat
  STRONG_BUY: strongLong,
  BUY: long,
  WEAK_BUY: weakLong,
  WEAK_SELL: weakShort,
  SELL: shortStyle,
  STRONG_SELL: strongShort,
};

interface Props {
  action: AnyAction;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SignalTypeBadge({ action, size = "md", className = "" }: Props) {
  const style = actionStyles[action] ?? actionStyles.HOLD;

  const sizes: Record<string, string> = {
    sm: "text-[9px] px-1.5 py-0.5",
    md: "text-[10px] px-2 py-0.5",
    lg: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-bold rounded-md select-none tracking-wide
        ${style.bg} ${style.border} ${style.text} ${sizes[size]} border
        ${className}
      `}
    >
      {style.label}
    </span>
  );
}
