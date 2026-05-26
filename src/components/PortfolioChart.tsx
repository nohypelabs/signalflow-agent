"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioData } from "@/lib/mock-data";
import type { SoDEXKline } from "@/lib/sodex-types";
import { fetchKlines } from "@/lib/api/datasources";
import Card from "@/components/ui/Card";

type Timeframe = "15m" | "1h" | "4h" | "1D" | "1W";

const TF_CONFIG: Record<Timeframe, { interval: string; limit: number }> = {
  "15m": { interval: "15m", limit: 96 },
  "1h":  { interval: "1h", limit: 168 },
  "4h":  { interval: "4h", limit: 180 },
  "1D":  { interval: "1d", limit: 90 },
  "1W":  { interval: "1w", limit: 52 },
};

const TF_LABELS: Record<Timeframe, string> = {
  "15m": "15M",
  "1h": "1H",
  "4h": "4H",
  "1D": "1D",
  "1W": "1W",
};

interface Props {
  klines?: SoDEXKline[] | null;
  symbol?: string;
  currentPrice?: number | null;
}

function fmtUSD(p: number) {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function fmtAxis(p: number) {
  if (p >= 10000) return `${(p / 1000).toFixed(1)}k`;
  if (p >= 100) return p.toFixed(0);
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export default function PortfolioChart({ klines: initialKlines, symbol, currentPrice }: Props) {
  const [tf, setTf] = useState<Timeframe>("1h");
  const [tfKlines, setTfKlines] = useState<SoDEXKline[] | null>(null);
  const [tfLoading, setTfLoading] = useState(false);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sodexSymbol = symbol
    ? `v${symbol.split("/")[0]}_v${symbol.split("/")[1]}`
    : undefined;

  const fetchTfKlines = useCallback(async (timeframe: Timeframe) => {
    if (!sodexSymbol) return;
    const config = TF_CONFIG[timeframe];
    setTfLoading(true);
    try {
      const data = await fetchKlines(sodexSymbol, config.interval, config.limit);
      // Ensure ascending order (oldest first) — SoDEX may return descending
      if (data) data.sort((a, b) => a.t - b.t);
      setTfKlines(data);
    } catch {
      setTfKlines(null);
    } finally {
      setTfLoading(false);
    }
  }, [sodexSymbol]);

  useEffect(() => { fetchTfKlines(tf); }, [tf, fetchTfKlines]);

  const activeKlines = tfKlines ?? initialKlines;
  const useReal = activeKlines && activeKlines.length > 0;

  // Build price series
  const closes: number[] = useReal
    ? activeKlines!.map((k) => parseFloat(k.c))
    : portfolioData.map((p) => p.value);
  const values = currentPrice != null && useReal ? [...closes, currentPrice] : closes;

  // Timestamps for tooltip
  const timestamps: number[] = useReal
    ? [...activeKlines!.map((k) => k.t), ...(currentPrice != null ? [Date.now()] : [])]
    : [];

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = max * 0.02; // 2% breathing room
  const yMax = max + pad;
  const yMin = min - pad;
  const yRange = yMax - yMin;

  const padL = 0, padR = 52, padT = 8, padB = 24;
  const vbW = 640, vbH = 240;
  const plotW = vbW - padR;
  const plotH = vbH - padT - padB;

  const scaleX = (i: number) => padL + (i / (values.length - 1)) * (plotW - padL);
  const scaleY = (v: number) => padT + plotH - ((v - yMin) / yRange) * plotH;

  // Smooth curve using catmull-rom → bezier approximation
  function toSmoothPath(vals: number[]): string {
    if (vals.length < 3) return vals.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");
    const tension = 0.3;
    let d = `M${scaleX(0).toFixed(1)},${scaleY(vals[0]).toFixed(1)}`;
    for (let i = 0; i < vals.length - 1; i++) {
      const p0 = vals[Math.max(0, i - 1)];
      const p1 = vals[i];
      const p2 = vals[i + 1];
      const p3 = vals[Math.min(vals.length - 1, i + 2)];
      const cp1y = p1 + (p2 - p0) * tension;
      const cp2y = p2 - (p3 - p1) * tension;
      d += ` C${scaleX(i + 0.33).toFixed(1)},${scaleY(cp1y).toFixed(1)} ${scaleX(i + 0.67).toFixed(1)},${scaleY(cp2y).toFixed(1)} ${scaleX(i + 1).toFixed(1)},${scaleY(p2).toFixed(1)}`;
    }
    return d;
  }

  const linePath = toSmoothPath(values);
  const lastX = scaleX(values.length - 1);
  const lastY = scaleY(values[values.length - 1]);

  // Area = same line but close to bottom
  const areaPath = `${linePath} L${lastX},${vbH - padB} L${scaleX(0)},${vbH - padB} Z`;

  const latest = values[values.length - 1];
  const first = values[0];
  const change = latest - first;
  const changePct = first ? ((change / first) * 100) : 0;
  const isUp = change >= 0;
  const lineColor = isUp ? "#00ff88" : "#ff4444";
  const lineColorDim = isUp ? "#00ff8830" : "#ff444430";

  const label = useReal ? (symbol ?? "BTC/USDC") : "Price Action";

  let dateLabel = "";
  if (useReal && activeKlines!.length > 0) {
    const kl = activeKlines!;
    const from = new Date(kl[0].t);
    const to = new Date(kl[kl.length - 1].t);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    dateLabel = `${fmt(from)} – ${fmt(to)}`;
  }

  // Hover tooltip
  const hIdx = hover?.idx ?? -1;
  const hPrice = hIdx >= 0 && hIdx < values.length ? values[hIdx] : null;
  const hTime = hIdx >= 0 && hIdx < timestamps.length ? timestamps[hIdx] : null;
  const hX = hIdx >= 0 ? scaleX(hIdx) : 0;
  const hY = hPrice != null ? scaleY(hPrice) : 0;

  function formatTooltipTime(ts: number) {
    const d = new Date(ts);
    if (tf === "15m" || tf === "1h") {
      return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    if (tf === "4h" || tf === "1D") {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  // Mouse handling
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || values.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const relX = mx / rect.width;
    const idx = Math.round(relX * (values.length - 1));
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    setHover({ idx: clamped, x: scaleX(clamped), y: scaleY(values[clamped]) });
  }

  function handleMouseLeave() {
    setHover(null);
  }

  const gridCount = 5;

  return (
    <Card padding="none" className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-1 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="text-sm font-medium text-txt-secondary tracking-wide truncate">{label}</h3>
            {dateLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-inset text-txt-muted shrink-0 tracking-wide">
                {dateLabel}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 shrink-0">
            <span className="text-lg font-semibold text-txt-primary font-mono tracking-tight tabular-nums">
              {fmtUSD(latest)}
            </span>
            <span className={`text-xs font-mono font-medium tracking-wide ${isUp ? "text-buy" : "text-sell"}`}>
              {isUp ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeframe pills */}
        <div className="flex items-center gap-1">
          {(Object.keys(TF_CONFIG) as Timeframe[]).map((p) => (
            <button
              key={p}
              onClick={() => setTf(p)}
              className={`
                text-[10px] font-medium px-2.5 py-1 rounded-md transition-all cursor-pointer tracking-wide
                ${tf === p
                  ? "text-txt-primary bg-elevated/80 shadow-sm"
                  : "text-txt-dim hover:text-txt-secondary hover:bg-inset/60"
                }
              `}
            >
              {TF_LABELS[p]}
            </button>
          ))}
          {tfLoading && (
            <span className="ml-2 text-[10px] text-accent animate-pulse-glow">updating</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 px-2 pb-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.12" />
              <stop offset="80%" stopColor={lineColor} stopOpacity="0.02" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: gridCount + 1 }, (_, i) => {
            const y = padT + (i / gridCount) * plotH;
            const price = yMax - (i / gridCount) * yRange;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={plotW} y2={y} stroke="#ffffff" strokeWidth="0.4" opacity="0.04" />
                <text x={plotW + 6} y={y + 3} fill="#555570" fontSize="8.5" fontFamily="monospace">
                  {fmtAxis(price)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Main line with glow */}
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" filter="url(#lineGlow)" />
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Live price dashed line */}
          <line x1={padL} y1={lastY} x2={plotW} y2={lastY} stroke={lineColor} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25" />

          {/* End dot with pulse */}
          <circle cx={lastX} cy={lastY} r="8" fill={lineColor} opacity="0.08">
            <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.08;0.02;0.08" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={lastX} cy={lastY} r="3" fill={lineColor} />
          <circle cx={lastX} cy={lastY} r="5" fill="none" stroke={lineColor} strokeWidth="0.8" opacity="0.3" />

          {/* Price tag at end */}
          <rect x={plotW - 2} y={lastY - 7} width="48" height="14" rx="3" fill={lineColor} opacity="0.9" />
          <text x={plotW + 22} y={lastY + 3} fill="#0a0a14" fontSize="8" fontFamily="monospace" fontWeight="600" textAnchor="middle">
            {fmtAxis(latest)}
          </text>

          {/* Time labels */}
          {useReal && activeKlines!.length > 0 && (() => {
            const kl = activeKlines!;
            const positions = [
              0,
              Math.floor((kl.length - 1) * 0.25),
              Math.floor((kl.length - 1) * 0.5),
              Math.floor((kl.length - 1) * 0.75),
              kl.length - 1,
            ];
            return positions.map((kIdx) => {
              const vIdx = currentPrice != null && kIdx === kl.length - 1 ? values.length - 1 : kIdx;
              const d = new Date(kl[kIdx].t);
              let timeStr: string;
              if (tf === "15m" || tf === "1h") {
                timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
              } else if (tf === "4h") {
                timeStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              } else if (tf === "1D") {
                timeStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              } else {
                timeStr = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
              }
              return (
                <text key={kIdx} x={scaleX(vIdx)} y={vbH - 6} fill="#555570" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  {timeStr}
                </text>
              );
            });
          })()}

          {/* Crosshair on hover */}
          {hover && hPrice != null && (
            <g>
              <line x1={hX} y1={padT} x2={hX} y2={vbH - padB} stroke="#ffffff" strokeWidth="0.5" opacity="0.12" strokeDasharray="2 2" />
              <line x1={padL} y1={hY} x2={plotW} y2={hY} stroke="#ffffff" strokeWidth="0.5" opacity="0.08" strokeDasharray="2 2" />
              <circle cx={hX} cy={hY} r="4" fill={lineColor} opacity="0.9" />
              <circle cx={hX} cy={hY} r="6" fill="none" stroke={lineColor} strokeWidth="0.8" opacity="0.3" />
            </g>
          )}
        </svg>
      </div>

      {/* Hover tooltip bar */}
      {hover && hPrice != null && hTime != null && (
        <div className="px-5 pb-3 flex items-center gap-4 text-[10px] font-mono text-txt-muted animate-fade-in">
          <span className="text-txt-secondary">{formatTooltipTime(hTime)}</span>
          <span className="text-txt-primary font-medium">{fmtUSD(hPrice)}</span>
          {hIdx > 0 && (
            <span className={values[hIdx] >= values[hIdx - 1] ? "text-buy" : "text-sell"}>
              {values[hIdx] >= values[hIdx - 1] ? "+" : ""}{((values[hIdx] - values[hIdx - 1]) / values[hIdx - 1] * 100).toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
