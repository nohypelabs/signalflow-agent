"use client";

import { type ReactNode, type HTMLAttributes } from "react";

const variants = {
  default: "bg-card border border-border-default",
  inset: "bg-inset border border-border-default",
  elevated: "bg-elevated border border-border-muted",
  ghost: "bg-transparent border-none",
};

const paddings = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  none: "p-0",
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
  padding?: keyof typeof paddings;
  hover?: boolean;
  accent?: string;
}

export default function Card({
  variant = "default",
  padding = "md",
  hover = false,
  accent,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <div
      className={`
        rounded-xl ${variants[variant]} ${paddings[padding]}
        ${hover ? "hover:border-accent-dim cursor-pointer" : ""}
        ${className}
      `}
      style={accent ? { borderTop: `2px solid ${accent}` } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
