"use client";

import type { Signal, SignalAction } from "@/lib/types/signal";

const actionStyles: Record<SignalAction, { bg: string; border: string; text: string; label: string }> = {
  BUY: {
    bg: "bg-buy-muted",
    border: "border-buy-dim",
    text: "text-buy",
    label: "BUY",
  },
  SELL: {
    bg: "bg-sell-muted",
    border: "border-sell-dim",
    text: "text-sell",
    label: "SELL",
  },
  HOLD: {
    bg: "bg-hold-muted",
    border: "border-hold-dim",
    text: "text-hold",
    label: "HOLD",
  },
};

interface Props {
  action: SignalAction;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SignalTypeBadge({ action, size = "md", className = "" }: Props) {
  const style = actionStyles[action];

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
