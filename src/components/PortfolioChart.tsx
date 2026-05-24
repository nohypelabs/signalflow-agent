"use client";

import { portfolioData } from "@/lib/mock-data";
import type { SoDEXKline } from "@/lib/sodex-types";

interface Props {
  klines?: SoDEXKline[] | null;
  symbol?: string;
}

export default function PortfolioChart({ klines, symbol }: Props) {
  const useReal = klines && klines.length > 0;
  const values = useReal
    ? klines.map((k) => parseFloat(k.c))
    : portfolioData.map((p) => p.value);
  const label = useReal ? `${symbol ?? ""} Price` : "Portfolio Performance";
  const subtitle = useReal
    ? `Last ${klines.length} candles`
    : "Last 30 days";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const w = 700;
  const h = 200;
  const padX = 0;
  const padY = 10;

  const points = values
    .map((v, i) => {
      const x = padX + (i / (values.length - 1)) * (w - padX * 2);
      const y = h - padY - ((v - min) / range) * (h - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padX},${h} ${points} ${w - padX},${h}`;

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-5 flex-1">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-[#666677]">{subtitle}</span>
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
        {values
          .map((v, i) => ({ v, i }))
          .filter(({ i }) => i % 7 === 0 || i === values.length - 1)
          .map(({ v, i }) => {
            const x = padX + (i / (values.length - 1)) * (w - padX * 2);
            const y = h - padY - ((v - min) / range) * (h - padY * 2);
            return <circle key={i} cx={x} cy={y} r="3" fill="#00d4ff" />;
          })}
      </svg>
      <div className="flex justify-between text-[10px] text-[#444455] mt-1">
        {useReal && klines ? (
          <>
            <span>{new Date(klines[0].t).toLocaleDateString()}</span>
            <span>{new Date(klines[Math.floor(klines.length / 2)].t).toLocaleDateString()}</span>
            <span>{new Date(klines[klines.length - 1].t).toLocaleDateString()}</span>
          </>
        ) : (
          <>
            <span>Day 1</span>
            <span>Day 15</span>
            <span>Day 30</span>
          </>
        )}
      </div>
    </div>
  );
}
