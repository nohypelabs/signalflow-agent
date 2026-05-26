"use client";

import { type ReactNode } from "react";

const variants: Record<string, string> = {
  buy: "bg-buy-muted text-buy border border-buy-dim",
  sell: "bg-sell-muted text-sell border border-sell-dim",
  hold: "bg-hold-muted text-hold border border-hold-dim",
  live: "bg-buy-muted text-live border border-buy-dim",
  warning: "bg-hold-muted text-warning border border-hold-dim",
  error: "bg-sell-muted text-error border border-sell-dim",
  info: "bg-[#00d4ff10] text-info border border-[#00d4ff30]",
  accent: "bg-accent-muted text-accent border border-accent-dim",
  muted: "bg-[#ffffff06] text-txt-muted border border-border-default",
  danger: "bg-sell-muted text-sell border border-sell-dim",
  success: "bg-buy-muted text-buy border border-buy-dim",
};

const sizes: Record<string, string> = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[10px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

interface Props {
  variant?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}

export default function Badge({
  variant = "muted",
  size = "md",
  className = "",
  children,
}: Props) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-semibold rounded-md select-none
        ${variants[variant] || variants.muted}
        ${sizes[size]}
        ${className}
      `}
    >
      {variant === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-glow" />
      )}
      {children}
    </span>
  );
}
