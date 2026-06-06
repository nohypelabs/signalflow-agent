"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // Match the welcome page exit/enter style for consistent "mulu" feel across navigation
  // (scale + opacity + blur) when switching pages via top header dropdown.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: 8, scale: 0.998, filter: "blur(1.5px)" }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
        }}
        exit={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: -6, scale: 1.005, filter: "blur(2px)" }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0.01 }
            : { duration: 0.28, ease: easeOut }
        }
        style={{ willChange: "transform, opacity, filter" }}
        className="relative"
      >
        {!prefersReducedMotion && (
          <motion.div
            initial={{ opacity: 0.25, scaleX: 0.96 }}
            animate={{ opacity: 0, scaleX: 1 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
          />
        )}
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
