"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "signalflow-dashboard-intro-dismissed";

const SHARDS = [
  { left: "-8%", top: "10%", width: "24%", height: "14%", delay: "-4s", duration: "13s", opacity: "0.34", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.95), rgba(255, 244, 214, 0.3) 42%, rgba(255, 199, 58, 0))" },
  { left: "6%", top: "24%", width: "28%", height: "12%", delay: "-9s", duration: "15s", opacity: "0.28", tint: "linear-gradient(135deg, rgba(0, 229, 168, 0.9), rgba(230, 255, 247, 0.28) 38%, rgba(0, 229, 168, 0))" },
  { left: "20%", top: "5%", width: "18%", height: "20%", delay: "-6s", duration: "12s", opacity: "0.22", tint: "linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(245, 247, 250, 0.18) 38%, rgba(255, 255, 255, 0))" },
  { left: "40%", top: "15%", width: "30%", height: "18%", delay: "-8s", duration: "18s", opacity: "0.24", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.8), rgba(255, 236, 171, 0.25) 40%, rgba(255, 199, 58, 0))" },
  { left: "56%", top: "30%", width: "22%", height: "14%", delay: "-2s", duration: "11s", opacity: "0.2", tint: "linear-gradient(135deg, rgba(165, 180, 252, 0.55), rgba(226, 232, 240, 0.2) 44%, rgba(165, 180, 252, 0))" },
  { left: "72%", top: "8%", width: "26%", height: "16%", delay: "-11s", duration: "16s", opacity: "0.25", tint: "linear-gradient(135deg, rgba(248, 250, 252, 0.85), rgba(203, 213, 225, 0.18) 36%, rgba(248, 250, 252, 0))" },
  { left: "84%", top: "34%", width: "20%", height: "12%", delay: "-5s", duration: "14s", opacity: "0.18", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.85), rgba(255, 255, 255, 0.15) 34%, rgba(255, 199, 58, 0))" },
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
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#070b14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,199,58,0.18),transparent_24%),radial-gradient(circle_at_86%_24%,rgba(0,229,168,0.14),transparent_22%),linear-gradient(135deg,#0c1525_0%,#08101c_42%,#05070d_100%)]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_52%,rgba(3,7,18,0.48)_100%)]" />

      <div className="absolute inset-0 overflow-hidden">
        {SHARDS.map((shard, index) => (
          <div
            key={`${shard.left}-${index}`}
            className="absolute -rotate-45 rounded-full blur-[1px]"
            style={{
              left: shard.left,
              top: shard.top,
              width: shard.width,
              height: shard.height,
              opacity: shard.opacity,
            }}
          >
            <div
              className="intro-drift absolute inset-0"
              style={{
                animationDelay: shard.delay,
                animationDuration: shard.duration,
              }}
            >
              <div className="intro-breathe absolute inset-0 rounded-full" style={{ background: shard.tint }} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-5 py-5 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between text-[11px] uppercase tracking-[0.3em] text-white/70">
          <div className="font-mono">signalflow</div>
          <div className="font-mono">paper futures gate</div>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#ffc73a]">SignalFlow Agent</p>
            <h1 className="mt-4 text-4xl font-light tracking-[-0.04em] text-[#f8f3e4] sm:text-6xl lg:text-7xl">
              Trade with structure.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
              Start in paper futures, validate the signal flow, then move into live execution only when you are ready.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={dismiss}
            className="group intro-glow relative h-16 w-full max-w-[360px] overflow-hidden rounded-full border border-white/10 bg-[#243550] p-1.5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:h-20"
              aria-label="Enter dashboard"
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <span className="absolute inset-y-1 left-1 right-16 flex items-center rounded-full bg-[#2d4261] px-6 text-[12px] font-bold uppercase tracking-[0.22em] text-white/95 transition-colors group-hover:bg-[#31496b] sm:text-[13px]">
                Enter Dashboard
              </span>
              <span className="absolute inset-y-1 right-1 flex w-14 items-center justify-center rounded-full bg-[#f3be2d] text-[#09111f] shadow-[0_8px_25px_rgba(243,190,45,0.3)] transition-transform group-hover:translate-x-0.5">
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

        <div className="flex items-end justify-between text-[11px] text-white/50">
          <p className="max-w-sm font-mono leading-5">
            Built for signal validation, execution review, and controlled entry into live trading.
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
