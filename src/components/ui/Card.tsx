"use client";

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";
import { motion } from "framer-motion";

const variants = {
  default: "bg-card border border-border-default",
  glass: "bg-black/30 backdrop-blur-xl border border-white/[0.08]",
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

interface Props {
  variant?: keyof typeof variants;
  padding?: keyof typeof paddings;
  hover?: boolean;
  accent?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function Card({
  variant = "default",
  padding = "md",
  hover = false,
  accent,
  className = "",
  style,
  children,
  onClick,
}: Props) {
  const baseClass = `rounded-lg ${variants[variant]} ${paddings[padding]} ${className}`;
  const accentStyle = accent
    ? { borderTop: `2px solid ${accent}`, ...style }
    : style;

  if (hover) {
    return (
      <motion.div
        whileHover={{
          y: -2,
          transition: { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] },
        }}
        className={`${baseClass} hover:border-border-muted hover:bg-elevated/20 cursor-pointer transition-[border-color,background-color,transform] duration-200`}
        style={accentStyle}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClass} style={accentStyle} onClick={onClick}>
      {children}
    </div>
  );
}
