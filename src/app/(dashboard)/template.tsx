"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.996 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.01 }
            : { duration: 0.26, ease: easeOut }
        }
        style={{ willChange: "transform, opacity" }}
        className="relative"
      >
        {!prefersReducedMotion && (
          <motion.div
            initial={{ opacity: 0.22, scaleX: 0.96 }}
            animate={{ opacity: 0, scaleX: 1 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
          />
        )}
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
