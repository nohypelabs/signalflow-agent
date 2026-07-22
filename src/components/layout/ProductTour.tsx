"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const TOUR_STORAGE_KEY = "signalflow-product-tour-done";

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
  note?: string;
}

const STEPS: TourStep[] = [
  {
    target: "market-selector",
    title: "Pick your market",
    body: "Start here. Select the pair you want to track — SoDEX tape, AI confluence and risk state all scope to this symbol.",
    placement: "bottom",
  },
  {
    target: "decision-score",
    title: "The decision score",
    body: "Live signal for the selected pair. Confidence, action (LONG / SHORT / HOLD) and a volatility-adjusted plan — scored by the 5-layer engine.",
    placement: "bottom",
  },
  {
    target: "layer-breakdown",
    title: "Why this signal",
    body: "Every signal is traceable. Trend, momentum, volatility, volume and structure factors — plus regime and the exact confluence math.",
    placement: "top",
  },
  {
    target: "signal-log",
    title: "Live signal log",
    body: "A rolling feed of generated signals across the market. Click any row to focus its evidence and chart.",
    placement: "top",
  },
  {
    target: "signals-tab",
    title: "The Signals workspace",
    body: "Switch to Signals for the full grid: summary cards, filters, AI reasoning drawer and your trading-type policy. That's the other half of SignalFlow.",
    placement: "right",
    note: "Use the sidebar » Signals",
  },
];

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
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const handleStart = () => {
      setActive(true);
      setStep(0);
    };
    window.addEventListener("start-signalflow-tour", handleStart);
    return () => {
      window.removeEventListener("start-signalflow-tour", handleStart);
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "1") {
        setActive(true);
        return;
      }
      if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
    } catch {
      // storage blocked — still allow tour
    }
    const t = setTimeout(() => setActive(true), 900);
    return () => clearTimeout(t);
  }, []);

  const measure = useCallback(() => {
    const current = STEPS[step];
    setRect(getRect(current.target));
  }, [step]);

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
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // non-critical
    }
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }, [step, finish]);

  const skip = useCallback(() => finish(), [finish]);

  const current = STEPS[step];
  const isSidebarStep = current.target === "signals-tab";
  const pad = 8;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[120]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Dim layer with spotlight cutout (skip for sidebar step — no element to highlight) */}
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

          {/* Tooltip */}
          <Tooltip
            step={current}
            index={step}
            total={STEPS.length}
            rect={rect}
            isSidebar={isSidebarStep}
            onNext={next}
            onSkip={skip}
          />
        </motion.div>
      )}
    </AnimatePresence>
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
