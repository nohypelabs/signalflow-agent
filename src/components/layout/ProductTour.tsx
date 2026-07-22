"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { PAGE_TOURS } from "@/lib/tours";
import type { TourStep } from "@/lib/tours";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(target: string): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function ProductTour() {
  const pathname = usePathname();
  const config = PAGE_TOURS[pathname];
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [buttonHovering, setButtonHovering] = useState(false);

  // Listen for manual trigger event
  useEffect(() => {
    if (!config) return;
    const handler = () => { setActive(true); setStep(0); };
    window.addEventListener(config.eventName, handler);
    return () => window.removeEventListener(config.eventName, handler);
  }, [config]);

  // Auto-trigger on first visit
  useEffect(() => {
    if (!config) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "1") {
        setActive(true);
        return;
      }
      if (localStorage.getItem(config.storageKey) === "1") return;
    } catch {}
    const t = setTimeout(() => setActive(true), 900);
    return () => clearTimeout(t);
  }, [config]);

  const finish = useCallback(() => {
    setActive(false);
    if (!config) return;
    try { localStorage.setItem(config.storageKey, "1"); } catch {}
  }, [config]);

  const measure = useCallback(() => {
    if (!config) return;
    const current = config.steps[step];
    setRect(getRect(current.target));
  }, [config, step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const interval = setInterval(measure, 150);
    const onResize = () => measure();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, measure, finish]);

  const next = useCallback(() => {
    if (!config) return;
    if (step < config.steps.length - 1) setStep((s) => s + 1);
    else finish();
  }, [config, step, finish]);

  const skip = useCallback(() => finish(), [finish]);

  if (!config) return null;

  const current = config.steps[step];
  const total = config.steps.length;
  const isSidebarStep = current.target === "signals-tab";
  const pad = 8;

  return (
    <>
      {/* Floating tour button */}
      <AnimatePresence>
        {!active && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed bottom-20 right-6 z-50"
            onMouseEnter={() => setButtonHovering(true)}
            onMouseLeave={() => setButtonHovering(false)}
          >
            <AnimatePresence>
              {buttonHovering && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="ticker-selector-glass-soft absolute right-14 top-2.5 whitespace-nowrap px-2.5 py-1 text-[11px] text-txt-primary shadow-lg"
                >
                  {config.buttonLabel}
                  <div className="absolute top-2.5 -right-1 h-1.5 w-1.5 rotate-45 border-t border-r border-white/10 bg-[#2e3440]" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => { setActive(true); setStep(0); }}
              className="ticker-selector-glass flex h-12 w-12 items-center justify-center text-[#f59e0b] hover:text-[#f59e0b] shadow-lg shadow-black/20 hover:border-[#f59e0b]/40 transition-colors cursor-pointer"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              aria-label={config.buttonLabel}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour overlay */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
            {/* Spotlight Mask (4 dynamic overlay panels + glowing border outline) */}
            {!isSidebarStep && rect && (
              <>
                {/* Top Overlay Panel */}
                <motion.div
                  className="fixed left-0 top-0 w-full pointer-events-auto"
                  animate={{ height: Math.max(0, rect.top - pad) }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  style={{ backgroundColor: "rgba(3, 7, 18, 0.78)" }}
                />

                {/* Bottom Overlay Panel */}
                <motion.div
                  className="fixed left-0 w-full bottom-0 pointer-events-auto"
                  animate={{ top: rect.top + rect.height + pad }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  style={{ backgroundColor: "rgba(3, 7, 18, 0.78)" }}
                />

                {/* Left Overlay Panel */}
                <motion.div
                  className="fixed left-0 pointer-events-auto"
                  animate={{
                    top: rect.top - pad,
                    width: Math.max(0, rect.left - pad),
                    height: rect.height + 2 * pad,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  style={{ backgroundColor: "rgba(3, 7, 18, 0.78)" }}
                />

                {/* Right Overlay Panel */}
                <motion.div
                  className="fixed right-0 pointer-events-auto"
                  animate={{
                    top: rect.top - pad,
                    left: rect.left + rect.width + pad,
                    height: rect.height + 2 * pad,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                  style={{ backgroundColor: "rgba(3, 7, 18, 0.78)" }}
                />

                {/* Glowing Accent Border Outline */}
                <motion.div
                  className="fixed border-[1.5px] border-accent rounded-xl shadow-[0_0_15px_rgba(0,229,168,0.35)] pointer-events-none"
                  animate={{
                    top: rect.top - pad,
                    left: rect.left - pad,
                    width: rect.width + 2 * pad,
                    height: rect.height + 2 * pad,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                />
              </>
            )}

            {/* Sidebar Full Mask (no highlight hole) */}
            {isSidebarStep && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[rgba(3,7,18,0.78)] pointer-events-auto"
              />
            )}

            {/* Tooltip Content Component */}
            <Tooltip
              step={current}
              index={step}
              total={total}
              rect={rect}
              isSidebar={isSidebarStep}
              onNext={next}
              onSkip={skip}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function Tooltip({
  step,
  index,
  total,
  rect,
  isSidebar,
  onNext,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: Rect | null;
  isSidebar: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const placement = step.placement ?? "bottom";
  const tooltipW = 320;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  let targetX = 16;
  let targetY = 90;

  if (isSidebar) {
    targetX = 76;
    targetY = 90;
  } else if (rect) {
    if (placement === "bottom") {
      targetX = Math.min(Math.max(rect.left, 12), vw - tooltipW - 12);
      targetY = rect.top + rect.height + 14;
    } else if (placement === "top") {
      targetX = Math.min(Math.max(rect.left, 12), vw - tooltipW - 12);
      targetY = Math.max(rect.top - 190, 12);
    } else if (placement === "right") {
      targetX = Math.min(rect.left + rect.width + 14, vw - tooltipW - 12);
      targetY = rect.top;
    } else {
      targetX = 12;
      targetY = rect.top;
    }
  }

  const isLast = index === total - 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: targetX, y: targetY }}
      animate={{ opacity: 1, scale: 1, x: targetX, y: targetY }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="fixed left-0 top-0 z-[121] w-[320px] max-w-[calc(100vw-24px)] rounded-[28px] border border-white/12 bg-[#0B1020]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl pointer-events-auto"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,229,168,0.6)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          {isSidebar ? step.note ?? "Sidebar" : `Step ${index + 1} / ${total}`}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-txt-primary">{step.title}</h3>
      <p className="mt-2 text-[12px] leading-6 text-txt-secondary">{step.body}</p>
      <p className="mt-3 text-[10px] text-txt-dim">Press <kbd className="rounded border border-white/10 bg-white/5 px-1 py-[1px] font-mono text-[9px]">ESC</kbd> to exit</p>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-[35px] px-3 py-1.5 text-[11px] font-medium text-txt-muted cursor-pointer transition-colors hover:text-txt-primary"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          className="group inline-flex items-center gap-2 rounded-[35px] border border-white/10 bg-[linear-gradient(180deg,#00E5A8,#00b386)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#04130d] cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLast ? "Got it" : "Next"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}


