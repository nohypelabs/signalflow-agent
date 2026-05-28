"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

const variants: Record<string, string> = {
  primary: "bg-accent text-[#05070D] font-bold hover:bg-accent/90 disabled:opacity-50",
  secondary: "bg-transparent text-accent border border-accent-dim hover:bg-accent-muted",
  danger: "bg-transparent text-error border border-sell-dim hover:bg-sell-muted",
  success: "bg-transparent text-buy border border-buy-dim hover:bg-buy-muted",
  ghost: "bg-transparent text-txt-muted hover:text-txt-secondary hover:bg-elevated",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-2.5 text-sm rounded-xl",
};

interface Props extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: string;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
      whileHover={{ scale: 1.01 }}
      className={`
        font-semibold inline-flex items-center justify-center gap-2
        ${variants[variant] || variants.primary}
        ${sizes[size]}
        disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
