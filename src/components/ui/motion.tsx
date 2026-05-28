"use client";

import { motion, type MotionProps, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

/* ── Shared easing ── */
export const easeOut = [0.25, 0.46, 0.45, 0.94] as const;
export const spring = { type: "spring" as const, stiffness: 400, damping: 30 };
export const springBounce = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ── Preset durations (ms) ── */
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

/* ── FadeSlide — fade in + slide from direction ── */
interface FadeSlideProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  delay?: number;
  duration?: number;
  className?: string;
}

const directionOffset = {
  up: { y: 12 },
  down: { y: -12 },
  left: { x: 12 },
  right: { x: -12 },
};

export function FadeSlide({
  children,
  direction = "up",
  distance = 12,
  delay = 0,
  duration: dur = duration.normal,
  className = "",
}: FadeSlideProps) {
  const offset = directionOffset[direction];
  const initial = {
    opacity: 0,
    x: "x" in offset ? (offset.x > 0 ? distance : -distance) : 0,
    y: "y" in offset ? (offset.y > 0 ? distance : -distance) : 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: dur, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── StaggerContainer — parent that staggers children ── */
interface StaggerProps {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  stagger = 0.04,
  delay = 0,
  className = "",
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── StaggerItem — child of StaggerContainer ── */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: duration.normal, ease: easeOut },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── HoverLift — subtle elevation on hover ── */
interface HoverLiftProps {
  children: ReactNode;
  distance?: number;
  className?: string;
}

export function HoverLift({
  children,
  distance = 2,
  className = "",
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: -distance, transition: { duration: duration.fast } }}
      whileTap={{ scale: 0.995 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── PressScale — subtle press feedback ── */
interface PressScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function PressScale({
  children,
  scale = 0.98,
  className = "",
}: PressScaleProps) {
  return (
    <motion.div
      whileTap={{ scale, transition: { duration: 0.1 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── PageTransition — wraps page content with enter/exit ── */
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: duration.normal, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
