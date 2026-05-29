"use client";

import { type ReactNode, type CSSProperties, type MouseEvent } from "react";
import { motion } from "framer-motion";

const variants = {
  default: "bg-card border border-border-default shadow-[0_1px_2px_rgba(0,0,0,0.28)]",
  inset: "bg-inset border border-border-default shadow-[0_1px_2px_rgba(0,0,0,0.22)]",
  elevated: "bg-elevated border border-border-muted shadow-[0_2px_6px_rgba(0,0,0,0.26)]",
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
        className={`${baseClass} hover:border-border-muted hover:shadow-[0_6px_16px_rgba(0,0,0,0.34)] cursor-pointer transition-[border-color,box-shadow] duration-200`}
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
