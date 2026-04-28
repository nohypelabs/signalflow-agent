"use client";

import { portfolioData } from "@/lib/mock-data";

export default function PortfolioChart() {
  const max = Math.max(...portfolioData.map((p) => p.value));
  const min = Math.min(...portfolioData.map((p) => p.value));
  const range = max - min || 1;

  const w = 700;
  const h = 200;
  const padX = 0;
  const padY = 10;

  const points = portfolioData
    .map((p, i) => {
      const x = padX + (i / (portfolioData.length - 1)) * (w - padX * 2);
      const y = h - padY - ((p.value - min) / range) * (h - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padX},${h} ${points} ${w - padX},${h}`;

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 flex-1">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">Portfolio Performance</h3>
        <span className="text-xs text-[#666677]">Last 30 days</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={0}
            y1={h - padY - frac * (h - padY * 2)}
            x2={w}
            y2={h - padY - frac * (h - padY * 2)}
            stroke="#ffffff"
            strokeWidth="0.5"
            opacity="0.06"
          />
        ))}
        <polygon points={areaPoints} fill="#00ff88" opacity="0.08" />
        <polyline
          points={points}
          fill="none"
          stroke="#00ff88"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {portfolioData
          .filter((_, i) => i % 7 === 0 || i === portfolioData.length - 1)
          .map((p, idx) => {
            const i = portfolioData.indexOf(p);
            const x = padX + (i / (portfolioData.length - 1)) * (w - padX * 2);
            const y = h - padY - ((p.value - min) / range) * (h - padY * 2);
            return <circle key={idx} cx={x} cy={y} r="3" fill="#00d4ff" />;
          })}
      </svg>
      <div className="flex justify-between text-[10px] text-[#444455] mt-1">
        <span>Day 1</span>
        <span>Day 10</span>
        <span>Day 20</span>
        <span>Day 30</span>
      </div>
    </div>
  );
}
