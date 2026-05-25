"use client";

import { portfolioData } from "@/lib/mock-data";
import type { SoDEXKline } from "@/lib/sodex-types";
import Card from "@/components/ui/Card";

interface Props {
  klines?: SoDEXKline[] | null;
  symbol?: string;
  currentPrice?: number | null;
}

function formatPrice(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export default function PortfolioChart({ klines, symbol, currentPrice }: Props) {
  const useReal = klines && klines.length > 0;

  const values: number[] = useReal
    ? [...klines.map((k) => parseFloat(k.c)), ...(currentPrice != null ? [currentPrice] : [])]
    : portfolioData.map((p) => p.value);

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const pad = { top: 12, right: 48, bottom: 20, left: 0 };
  const vbW = 600;
  const vbH = 220;
  const plotW = vbW - pad.right;

  const scaleX = (i: number) => (i / (values.length - 1)) * plotW;
  const scaleY = (v: number) => vbH - pad.bottom - ((v - min) / range) * (vbH - pad.top - pad.bottom);

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ");
  const areaPath = `M0,${vbH - pad.bottom} L${linePath.slice(1)} L${plotW},${vbH - pad.bottom} Z`;

  const latest = values[values.length - 1];
  const prev = values[values.length - 2] ?? latest;
  const change = latest - prev;
  const changePct = prev ? ((change / prev) * 100) : 0;
  const isUp = change >= 0;

  const gridLines = 4;
  const label = useReal ? (symbol ?? "BTC/USDC") : "Portfolio Performance";
  const subtitle = useReal
    ? `${values.length} candles`
    : "Last 30 days";

  return (
    <Card padding="md" className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm truncate">{label}</h3>
          {useReal && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-inset text-txt-muted shrink-0">
              {new Date(klines[0].t).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(klines[klines.length - 1].t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="font-mono font-semibold text-txt-primary">
            {formatPrice(latest)}
          </span>
          <span className={`font-mono text-[11px] ${isUp ? "text-buy" : "text-sell"}`}>
            {isUp ? "+" : ""}{formatPrice(change)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Time period row */}
      <div className="flex items-center gap-1 mb-2 shrink-0">
        {["1D", "1W", "1M", "ALL"].map((p, i) => (
          <span
            key={p}
            className={`text-[10px] px-1.5 py-0.5 rounded cursor-default ${
              i === 2 ? "text-accent" : "text-txt-dim hover:text-txt-secondary"
            }`}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full flex-1 min-h-0 cursor-crosshair"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#00ff88" : "#ff4444"} stopOpacity="0.20" />
            <stop offset="100%" stopColor={isUp ? "#00ff88" : "#ff4444"} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = pad.top + (i / gridLines) * (vbH - pad.top - pad.bottom);
          const price = max - (i / gridLines) * range;
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={plotW} y2={y} stroke="var(--text-dim)" strokeWidth="0.5" opacity="0.15" />
              <text x={plotW + 4} y={y + 3} fill="var(--text-muted)" fontSize="9">
                {formatPrice(price)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke={isUp ? "#00ff88" : "#ff4444"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Latest price dot */}
        <circle cx={scaleX(values.length - 1)} cy={scaleY(latest)} r="3.5" fill={isUp ? "#00ff88" : "#ff4444"} stroke="var(--bg-card)" strokeWidth="2" />
        <circle cx={scaleX(values.length - 1)} cy={scaleY(latest)} r="6" fill="none" stroke={isUp ? "#00ff88" : "#ff4444"} strokeWidth="1" opacity="0.2" />

        {/* Time labels */}
        {useReal && [0, Math.floor((klines.length - 1) / 2), klines.length - 1].map((kIdx) => {
          const vIdx = currentPrice != null && kIdx === klines.length - 1 ? values.length - 1 : kIdx;
          return (
            <text key={kIdx} x={scaleX(vIdx)} y={vbH - 3} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
              {new Date(klines[kIdx].t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          );
        })}
        {currentPrice != null && (
          <text x={scaleX(values.length - 1)} y={vbH - 3} fill="#00ff88" fontSize="9" textAnchor="middle" fontWeight="bold">
            Now
          </text>
        )}
        {!useReal && (
          <>
            <text x={scaleX(0)} y={vbH - 3} fill="var(--text-muted)" fontSize="9" textAnchor="middle">Day 1</text>
            <text x={scaleX(14)} y={vbH - 3} fill="var(--text-muted)" fontSize="9" textAnchor="middle">Day 15</text>
            <text x={scaleX(29)} y={vbH - 3} fill="var(--text-muted)" fontSize="9" textAnchor="middle">Day 30</text>
          </>
        )}
      </svg>
    </Card>
  );
}
