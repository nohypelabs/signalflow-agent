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

  const measure = useCallback(() => {
    if (!config) return;
    const current = config.steps[step];
    setRect(getRect(current.target));
  }, [config, step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  const finish = useCallback(() => {
    setActive(false);
    if (!config) return;
    try { localStorage.setItem(config.storageKey, "1"); } catch {}
  }, [config]);

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
          <motion.div
            className="fixed inset-0 z-[120]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {!isSidebarStep && rect && (
              <motion.div
                key={`spot-${step}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  background: `rgba(3,7,18,0.78)`,
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                    ${rect.left - pad}px ${rect.top - pad}px,
                    ${rect.left - pad}px ${rect.top + rect.height + pad}px,
                    ${rect.left + rect.width + pad}px ${rect.top + rect.height + pad}px,
                    ${rect.left + rect.width + pad}px ${rect.top - pad}px,
                    ${rect.left - pad}px ${rect.top - pad}px)`,
                  pointerEvents: "none",
                }}
              />
            )}
            {isSidebarStep && (
              <div className="absolute inset-0 bg-[rgba(3,7,18,0.78)]" />
            )}

            <Tooltip
              step={current}
              index={step}
              total={total}
              rect={rect}
              isSidebar={isSidebarStep}
              onNext={next}
              onSkip={skip}
            />
          </motion.div>
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
  const [style, setStyle] = useState<React.CSSProperties>({});
  const placement = step.placement ?? "bottom";
  const tooltipW = 320;

  useEffect(() => {
    if (isSidebar) {
      setStyle({ left: 76, top: 90 });
      return;
    }
    if (!rect) {
      setStyle({ left: 16, top: 90 });
      return;
    }
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (placement === "bottom") {
      setStyle({ left: Math.min(Math.max(rect.left, 12), vw - tooltipW - 12), top: rect.top + rect.height + 14 });
    } else if (placement === "top") {
      setStyle({ left: Math.min(Math.max(rect.left, 12), vw - tooltipW - 12), top: Math.max(rect.top - 160, 12) });
    } else if (placement === "right") {
      setStyle({ left: Math.min(rect.left + rect.width + 14, vw - tooltipW - 12), top: rect.top });
    } else {
      setStyle({ left: 12, top: rect.top });
    }
  }, [rect, isSidebar, placement]);

  const isLast = index === total - 1;

  return (
    <motion.div
      key={`tip-${index}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="absolute z-[121] w-[320px] max-w-[calc(100vw-24px)] rounded-[28px] border border-white/12 bg-[#0B1020]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={style}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,229,168,0.6)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          {isSidebar ? step.note ?? "Sidebar" : `Step ${index + 1} / ${total}`}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-txt-primary">{step.title}</h3>
      <p className="mt-2 text-[12px] leading-6 text-txt-secondary">{step.body}</p>

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
