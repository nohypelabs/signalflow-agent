"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SignalFlow3DScene = dynamic(() => import("./SignalFlow3DScene"), {
  ssr: false,
  loading: () => null,
});

export default function WelcomeMotionBackground() {
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
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#030712]" aria-hidden="true">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,136,0,0.11),transparent_27%),linear-gradient(180deg,#06101e_0%,#030712_58%,#02040a_100%)]" />
      <div className="absolute inset-x-0 top-[18%] z-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute left-1/2 top-[35%] z-0 h-[min(42vw,460px)] w-[min(42vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff8800]/15 bg-[#ff8800]/[0.018] shadow-[0_0_54px_rgba(255,136,0,0.12)]" />
      <div className="absolute left-1/2 top-[35%] z-0 h-[min(24vw,260px)] w-[min(24vw,260px)] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#00d4ff]/15 bg-[#00d4ff]/[0.014]" />
      {loadScene && <SignalFlow3DScene />}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,rgba(3,7,18,0.22)_0%,rgba(3,7,18,0.08)_42%,rgba(3,7,18,0.62)_100%)]" />
    </div>
  );
}
