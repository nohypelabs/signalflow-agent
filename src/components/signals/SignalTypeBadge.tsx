"use client";

import type { SignalAction, SignalActionV2 } from "@/lib/types/signal";

type AnyAction = SignalAction | SignalActionV2;

const actionStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  STRONG_BUY: {
    bg: "bg-[#00ff88]/20",
    border: "border-[#00ff88]/40",
    text: "text-[#00ff88]",
    label: "STRONG BUY",
  },
  BUY: {
    bg: "bg-buy-muted",
    border: "border-buy-dim",
    text: "text-buy",
    label: "BUY",
  },
  WEAK_BUY: {
    bg: "bg-[#00ff88]/10",
    border: "border-[#00ff88]/20",
    text: "text-[#00ff88]/70",
    label: "WEAK BUY",
  },
  HOLD: {
    bg: "bg-hold-muted",
    border: "border-hold-dim",
    text: "text-hold",
    label: "HOLD",
  },
  WEAK_SELL: {
    bg: "bg-[#ff4444]/10",
    border: "border-[#ff4444]/20",
    text: "text-[#ff4444]/70",
    label: "WEAK SELL",
  },
  SELL: {
    bg: "bg-sell-muted",
    border: "border-sell-dim",
    text: "text-sell",
    label: "SELL",
  },
  STRONG_SELL: {
    bg: "bg-[#ff4444]/20",
    border: "border-[#ff4444]/40",
    text: "text-[#ff4444]",
    label: "STRONG SELL",
  },
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
