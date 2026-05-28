"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "signalflow-dashboard-intro-dismissed";

const SHARDS = [
  { left: "-12%", top: "12%", width: "28%", height: "15%", delay: "-4s", duration: "13s", opacity: "0.38", tint: "linear-gradient(135deg, rgba(0, 229, 168, 0.95), rgba(220, 255, 247, 0.22) 44%, rgba(0, 229, 168, 0))" },
  { left: "4%", top: "23%", width: "30%", height: "13%", delay: "-9s", duration: "15s", opacity: "0.3", tint: "linear-gradient(135deg, rgba(0, 212, 255, 0.92), rgba(220, 244, 255, 0.22) 40%, rgba(0, 212, 255, 0))" },
  { left: "18%", top: "4%", width: "20%", height: "22%", delay: "-6s", duration: "12s", opacity: "0.24", tint: "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(145, 158, 179, 0.16) 38%, rgba(255, 255, 255, 0))" },
  { left: "36%", top: "16%", width: "34%", height: "19%", delay: "-8s", duration: "18s", opacity: "0.26", tint: "linear-gradient(135deg, rgba(74, 111, 255, 0.84), rgba(214, 220, 255, 0.18) 40%, rgba(74, 111, 255, 0))" },
  { left: "54%", top: "31%", width: "24%", height: "15%", delay: "-2s", duration: "11s", opacity: "0.22", tint: "linear-gradient(135deg, rgba(94, 234, 212, 0.58), rgba(226, 232, 240, 0.14) 44%, rgba(94, 234, 212, 0))" },
  { left: "70%", top: "7%", width: "28%", height: "17%", delay: "-11s", duration: "16s", opacity: "0.3", tint: "linear-gradient(135deg, rgba(248, 250, 252, 0.88), rgba(99, 127, 255, 0.12) 36%, rgba(248, 250, 252, 0))" },
  { left: "83%", top: "35%", width: "22%", height: "12%", delay: "-5s", duration: "14s", opacity: "0.2", tint: "linear-gradient(135deg, rgba(0, 212, 255, 0.86), rgba(255, 255, 255, 0.1) 34%, rgba(0, 212, 255, 0))" },
];

const BEAMS = [
  { left: "-6%", top: "38%", width: "44%", height: "8%", delay: "-8s", duration: "19s", opacity: "0.18", tint: "linear-gradient(135deg, rgba(0, 229, 168, 0.78), rgba(255,255,255,0.06) 45%, rgba(0, 229, 168, 0))" },
  { left: "26%", top: "8%", width: "40%", height: "9%", delay: "-12s", duration: "23s", opacity: "0.15", tint: "linear-gradient(135deg, rgba(0, 212, 255, 0.76), rgba(255,255,255,0.06) 45%, rgba(0, 212, 255, 0))" },
  { left: "58%", top: "26%", width: "38%", height: "8%", delay: "-16s", duration: "20s", opacity: "0.16", tint: "linear-gradient(135deg, rgba(74, 111, 255, 0.8), rgba(255,255,255,0.05) 45%, rgba(74, 111, 255, 0))" },
  { left: "74%", top: "54%", width: "32%", height: "7%", delay: "-5s", duration: "18s", opacity: "0.12", tint: "linear-gradient(135deg, rgba(94, 234, 212, 0.7), rgba(255,255,255,0.05) 45%, rgba(94, 234, 212, 0))" },
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(0,212,255,0.16),transparent_24%),radial-gradient(circle_at_86%_24%,rgba(0,229,168,0.14),transparent_22%),linear-gradient(135deg,#09101c_0%,#07111b_42%,#04060b_100%)]" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(3,7,18,0.54)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(255,255,255,0.02),transparent_22%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_24%,transparent_48%,rgba(255,255,255,0.02)_68%,transparent_100%)] opacity-30 [background-size:220%_220%] animate-shimmer" />

      <div className="absolute inset-0 overflow-hidden">
        {BEAMS.map((beam, index) => (
          <div
            key={`beam-${beam.left}-${index}`}
            className="absolute -rotate-45 rounded-full blur-[8px]"
            style={{
              left: beam.left,
              top: beam.top,
              width: beam.width,
              height: beam.height,
              opacity: beam.opacity,
            }}
          >
            <div
              className="intro-drift absolute inset-0"
              style={{
                animationDelay: beam.delay,
                animationDuration: beam.duration,
              }}
            >
              <div
                className="intro-breathe absolute inset-0 rounded-full"
                style={{
                  background: beam.tint,
                  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.3), inset 0 0 24px rgba(255, 255, 255, 0.1)",
                }}
              />
            </div>
          </div>
        ))}
        {SHARDS.map((shard, index) => (
          <div
            key={`${shard.left}-${index}`}
            className="absolute -rotate-45 rounded-full blur-[0.5px] shadow-[0_0_40px_rgba(0,0,0,0.32)]"
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
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#00e5a8]">SignalFlow Agent</p>
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
              className="group intro-glow relative h-16 w-full max-w-[440px] overflow-hidden rounded-full border border-white/10 bg-[#1a2840] p-1.5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:h-20"
              aria-label="Enter dashboard"
            >
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <span className="absolute inset-y-1 left-1 right-[86px] flex items-center rounded-full border border-white/6 bg-[#243556] px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white/95 transition-colors group-hover:bg-[#2a4067] sm:text-[13px]">
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
