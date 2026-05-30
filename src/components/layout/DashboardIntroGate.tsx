"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SignalFlow3DScene = dynamic(() => import("./SignalFlow3DScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050a14]" />,
});

const STORAGE_KEY = "signalflow-dashboard-intro-dismissed";

const SOURCE_LABELS = [
  { label: "MACRO",     x: "14%",  y: "22%", color: "#00d4ff" },
  { label: "PRICE",     x: "80%",  y: "24%", color: "#00ff88" },
  { label: "ORDERFLOW",  x: "12%",  y: "72%", color: "#4a6fff" },
  { label: "ORDERBOOK", x: "78%",  y: "74%", color: "#a855f7" },
  { label: "AI",        x: "48%",  y: "12%", color: "#f5c842" },
];

export default function DashboardIntroGate() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    } finally {
      setReady(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!ready || !open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden text-white">
      {/* 3D Background */}
      <SignalFlow3DScene />

      {/* Source labels overlay */}
      {SOURCE_LABELS.map((src) => (
        <div
          key={src.label}
          className="pointer-events-none absolute z-10 flex items-center gap-2"
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

      {/* Signal → Execution label */}
      <div className="pointer-events-none absolute right-[12%] top-1/2 z-10 -translate-y-1/2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00e5a8] opacity-70">
          signal → execution
        </span>
      </div>

      {/* Content overlay */}
      <div className="relative z-20 flex h-full flex-col justify-between px-5 py-5 sm:px-8 sm:py-8">
        {/* Top bar */}
        <div className="flex items-start justify-between text-[11px] uppercase tracking-[0.3em] text-white/70">
          <div className="font-mono">signalflow</div>
          <div className="font-mono">paper futures gate</div>
        </div>

        {/* Center content */}
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#00e5a8]">SignalFlow Agent</p>
            <h1 className="mt-4 text-4xl font-light tracking-[-0.04em] text-[#f8f3e4] sm:text-6xl lg:text-7xl">
              From signal to execution. Zero emotion.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
              AI-powered confluence engine scores every opportunity across 5 dimensions. Start in paper futures, validate the flow, then execute when the data says go.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={dismiss}
              className="group intro-glow relative h-16 w-full max-w-[440px] overflow-hidden rounded-full border border-white/10 bg-[#1a2840]/80 p-1.5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:h-20"
              aria-label="Enter dashboard"
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <span className="absolute inset-y-1 left-1 right-[86px] flex items-center rounded-full border border-white/6 bg-[#243556]/80 px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white/95 transition-colors group-hover:bg-[#2a4067] sm:text-[13px]">
                Enter Dashboard
              </span>
              <span className="absolute inset-y-1 right-1 flex w-[78px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#12d3f5_0%,#00e5a8_100%)] text-[#07111b] shadow-[0_8px_25px_rgba(0,212,255,0.25)] transition-transform group-hover:translate-x-0.5">
                <ArrowIcon />
              </span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.26em] text-white/45">
            <span>paper futures first</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>live execution optional</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-end justify-between text-[11px] text-white/50">
          <p className="max-w-sm font-mono leading-5">
            AI-driven signals. Multi-timeframe confluence. Paper-first execution.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-white/55 hover:border-white/20 hover:text-white/80"
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
