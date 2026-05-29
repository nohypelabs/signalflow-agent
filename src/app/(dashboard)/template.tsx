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
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.998 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.998 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.01 }
            : { duration: 0.18, ease: easeOut }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
