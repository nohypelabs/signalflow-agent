"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "signalflow-dashboard-intro-dismissed";

const SHARDS = [
  { left: "-12%", top: "12%", width: "28%", height: "15%", delay: "-4s", duration: "13s", opacity: "0.34", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.95), rgba(255, 244, 214, 0.28) 44%, rgba(255, 199, 58, 0))" },
  { left: "4%", top: "23%", width: "30%", height: "13%", delay: "-9s", duration: "15s", opacity: "0.28", tint: "linear-gradient(135deg, rgba(0, 229, 168, 0.9), rgba(230, 255, 247, 0.24) 40%, rgba(0, 229, 168, 0))" },
  { left: "18%", top: "4%", width: "20%", height: "22%", delay: "-6s", duration: "12s", opacity: "0.22", tint: "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(245, 247, 250, 0.15) 38%, rgba(255, 255, 255, 0))" },
  { left: "36%", top: "16%", width: "34%", height: "19%", delay: "-8s", duration: "18s", opacity: "0.24", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.82), rgba(255, 236, 171, 0.22) 40%, rgba(255, 199, 58, 0))" },
  { left: "54%", top: "31%", width: "24%", height: "15%", delay: "-2s", duration: "11s", opacity: "0.2", tint: "linear-gradient(135deg, rgba(165, 180, 252, 0.52), rgba(226, 232, 240, 0.18) 44%, rgba(165, 180, 252, 0))" },
  { left: "70%", top: "7%", width: "28%", height: "17%", delay: "-11s", duration: "16s", opacity: "0.25", tint: "linear-gradient(135deg, rgba(248, 250, 252, 0.88), rgba(203, 213, 225, 0.16) 36%, rgba(248, 250, 252, 0))" },
  { left: "83%", top: "35%", width: "22%", height: "12%", delay: "-5s", duration: "14s", opacity: "0.18", tint: "linear-gradient(135deg, rgba(255, 199, 58, 0.85), rgba(255, 255, 255, 0.13) 34%, rgba(255, 199, 58, 0))" },
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
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_52%,rgba(3,7,18,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(255,255,255,0.02),transparent_22%)]" />

      <div className="absolute inset-0 overflow-hidden">
        {SHARDS.map((shard, index) => (
          <div
            key={`${shard.left}-${index}`}
            className="absolute -rotate-45 rounded-full blur-[1px] shadow-[0_0_40px_rgba(0,0,0,0.3)]"
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
              <div
                className="intro-breathe absolute inset-0 rounded-full border border-white/10"
                style={{
                  background: shard.tint,
                  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 0 18px rgba(255, 255, 255, 0.12)",
                }}
              />
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
              className="group intro-glow relative h-16 w-full max-w-[420px] overflow-hidden rounded-full border border-white/10 bg-[#22324c] p-1.5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:h-20"
              aria-label="Enter dashboard"
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <span className="absolute inset-y-1 left-1 right-[78px] flex items-center rounded-full border border-white/6 bg-[#2c4060] px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white/95 transition-colors group-hover:bg-[#334b70] sm:text-[13px]">
                Enter Dashboard
              </span>
              <span className="absolute inset-y-1 right-1 flex w-[70px] items-center justify-center rounded-full bg-[#f3be2d] text-[#09111f] shadow-[0_8px_25px_rgba(243,190,45,0.3)] transition-transform group-hover:translate-x-0.5">
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
