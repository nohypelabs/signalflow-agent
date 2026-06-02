"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SignalFlow3DScene = dynamic(() => import("./SignalFlow3DScene"), {
  ssr: false,
  loading: () => null,
});

const SOURCE_LABELS = [
  { label: "MARKET TAPE", x: "14%", y: "38%", color: "#00d4ff" },
  { label: "SIGNAL ENGINE", x: "86%", y: "30%", color: "#ff8800" },
  { label: "EXECUTION", x: "84%", y: "66%", color: "#00e5a8" },
];

const PIPELINE_STEPS = [
  { label: "SoDEX tape", value: "live" },
  { label: "AI confluence", value: "scored" },
  { label: "Risk state", value: "bounded" },
];

interface WelcomeExperienceProps {
  onEnter: () => void;
  className?: string;
}

export default function WelcomeExperience({
  onEnter,
  className = "fixed inset-0 z-[90]",
}: WelcomeExperienceProps) {
  const [loadScene, setLoadScene] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const hasIdleCallback = "requestIdleCallback" in window;
    const idle = hasIdleCallback
      ? window.requestIdleCallback(() => setLoadScene(true), { timeout: 900 })
      : window.setTimeout(() => setLoadScene(true), 260);

    return () => {
      if (hasIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <div className={`${className} overflow-hidden bg-[#030712] text-white`}>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,136,0,0.11),transparent_27%),linear-gradient(180deg,#06101e_0%,#030712_58%,#02040a_100%)]" />
      <div className="absolute inset-x-0 top-[18%] z-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute left-1/2 top-[35%] z-0 h-[min(42vw,460px)] w-[min(42vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff8800]/15 bg-[#ff8800]/[0.018] shadow-[0_0_54px_rgba(255,136,0,0.12)]" />
      <div className="absolute left-1/2 top-[35%] z-0 h-[min(24vw,260px)] w-[min(24vw,260px)] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#00d4ff]/15 bg-[#00d4ff]/[0.014]" />
      {loadScene && <SignalFlow3DScene />}

      {SOURCE_LABELS.map((src) => (
        <div
          key={src.label}
          className="pointer-events-none absolute z-10 hidden items-center gap-2 opacity-70 sm:flex"
          style={{ left: src.x, top: src.y, transform: "translate(-50%, -50%)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: src.color, boxShadow: `0 0 8px ${src.color}` }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: src.color, textShadow: `0 0 12px ${src.color}40` }}
          >
            {src.label}
          </span>
        </div>
      ))}

      <div className="pointer-events-none absolute left-[13%] bottom-[18%] z-10 hidden sm:block">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          paper validation / live execution
        </span>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[15] h-[420px] w-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(3,7,18,0.88)_0%,rgba(3,7,18,0.7)_38%,rgba(3,7,18,0.18)_68%,transparent_100%)]" />

      <div className="relative z-20 flex h-full min-h-screen flex-col justify-between px-5 py-5 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-white/70 sm:text-[11px]">
          <div className="font-mono text-[#ffb04d]">signalflow</div>
          <div className="hidden font-mono sm:block">sodex / ai / execution</div>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <div className="mx-auto mb-7 max-w-3xl text-center">
            <p className="text-[10px] uppercase tracking-[0.36em] text-[#ff8800]">SignalFlow Agent</p>
            <h1 className="mx-auto mt-4 text-4xl font-semibold leading-[0.98] tracking-normal text-[#f8f3e4] drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl">
              Market tape in. Signal out.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/78 drop-shadow-[0_8px_24px_rgba(0,0,0,0.75)] sm:text-base">
              A fast paper-first command gate for SoDEX tape, AI reasoning, risk state, and controlled execution.
            </p>
          </div>

          <div className="mx-auto mb-6 grid max-w-2xl grid-cols-3 gap-2">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.label} className="rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-center backdrop-blur-[2px]">
                <p className="truncate text-[9px] uppercase tracking-[0.2em] text-white/45">{step.label}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">{step.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onEnter}
              className="group intro-glow relative h-[60px] w-full max-w-[420px] cursor-pointer overflow-hidden rounded-full border border-white/10 bg-[#111827]/92 p-1.5 text-left shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform hover:scale-[1.01] active:scale-[0.99] sm:h-[72px]"
              aria-label="Enter dashboard"
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <span className="absolute inset-y-1 left-1 right-[86px] flex items-center rounded-full border border-white/6 bg-[#192235]/90 px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white/95 transition-colors group-hover:bg-[#202c43] sm:text-[13px]">
                Enter Dashboard
              </span>
              <span className="absolute inset-y-1 right-1 flex w-[78px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffb04d_0%,#ff8800_100%)] text-[#07111b] shadow-[0_8px_25px_rgba(255,136,0,0.22)] transition-transform group-hover:translate-x-0.5">
                <ArrowIcon />
              </span>
            </button>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3 text-center text-[10px] uppercase tracking-[0.22em] text-white/48">
            <span>paper futures first</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>live execution optional</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 text-[11px] text-white/50">
          <p className="max-w-sm font-mono leading-5 text-white/55">
            AI-driven signals. Multi-timeframe confluence. Paper-first execution.
          </p>
          <button
            type="button"
            onClick={onEnter}
            className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-white/55 hover:border-white/20 hover:text-white/80"
          >
            Skip Intro
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
