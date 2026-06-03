"use client";

import { useMemo, useState, useRef, useCallback } from "react";

interface DataPoint {
  date: number;
  value: number;
  pnl: number;
}

interface Props {
  data: DataPoint[];
  benchmark?: { date: number; value: number }[];
  benchmarkLabel?: string;
  height?: number;
}

export default function EquityCurve({
  data,
  benchmark,
  benchmarkLabel = "BTC",
  height = 220,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const padding = { top: 16, right: 16, bottom: 28, left: 60 };

  const chartWidth = 800;
  const chartHeight = height;
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const { pathD, areaD, benchPathD, yMin, yMax, points } = useMemo(() => {
    if (data.length < 2) {
      return { pathD: "", areaD: "", benchPathD: "", yMin: 0, yMax: 1, points: [] };
    }

    const values = data.map((d) => d.value);
    const benchValues = benchmark?.map((d) => d.value) ?? [];
    const allValues = [...values, ...benchValues];

    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.05;
    maxVal += range * 0.05;

    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * innerW;
    const yScale = (v: number) =>
      padding.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

    const pts = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.value),
      data: d,
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `${line} L ${pts[pts.length - 1].x} ${padding.top + innerH} L ${pts[0].x} ${padding.top + innerH} Z`;

    // Benchmark path
    let benchPath = "";
    if (benchmark && benchmark.length >= 2) {
      // Normalize benchmark to same starting value
      const startValue = data[0].value;
      const benchStart = benchmark[0].value;
      const benchScale = benchStart > 0 ? startValue / benchStart : 1;

      const benchPts = benchmark.map((b, i) => ({
        x: padding.left + (i / (benchmark.length - 1)) * innerW,
        y: yScale(b.value * benchScale),
      }));

      benchPath = benchPts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
    }

    return {
      pathD: line,
      areaD: area,
      benchPathD: benchPath,
      yMin: minVal,
      yMax: maxVal,
      points: pts,
    };
  }, [data, benchmark, innerW, innerH, padding.left, padding.top]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return;

      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * chartWidth;

      // Find closest point
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - x);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoverIndex(closest);
    },
    [points, chartWidth],
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const val = yMin + step * i;
      return {
        value: val,
        y: padding.top + innerH - ((val - yMin) / (yMax - yMin)) * innerH,
      };
    });
  }, [yMin, yMax, innerH, padding.top]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-txt-faint" style={{ height }}>
        Not enough data for equity curve
      </div>
    );
  }

  const isPositive = data[data.length - 1].value >= data[0].value;
  const strokeColor = isPositive ? "var(--color-buy, #00ff88)" : "var(--color-sell, #ff4444)";
  const fillId = "equity-gradient";

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={chartWidth - padding.right}
              y2={tick.y}
              stroke="#1E293B"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              fill="#475569"
              fontSize={9}
              fontFamily="monospace"
            >
              ${Math.round(tick.value).toLocaleString()}
            </text>
          </g>
        ))}

        {/* Benchmark line */}
        {benchPathD && (
          <path
            d={benchPathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        )}

        {/* Area fill */}
        <path d={areaD} fill={`url(#${fillId})`} />

        {/* Main line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2} />

        {/* Hover crosshair */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={padding.top}
              x2={hoverPoint.x}
              y2={padding.top + innerH}
              stroke="#475569"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r={4}
              fill={strokeColor}
              stroke="#0B1020"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverPoint && hoverData && (
        <div
          className="absolute pointer-events-none rounded-lg border border-border-default bg-card px-3 py-2 shadow-xl z-10"
          style={{
            left: `${(hoverPoint.x / chartWidth) * 100}%`,
            top: 0,
            transform: `translateX(${hoverPoint.x > chartWidth / 2 ? "-100%" : "0"}) translateY(-4px)`,
          }}
        >
          <p className="text-[10px] text-txt-faint font-mono">
            {hoverData.date > 0
              ? new Date(hoverData.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Start"}
          </p>
          <p className="text-xs font-mono font-semibold text-txt-primary">
            ${hoverData.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          {hoverData.pnl !== 0 && (
            <p
              className={`text-[10px] font-mono ${hoverData.pnl >= 0 ? "text-buy" : "text-sell"}`}
            >
              {hoverData.pnl >= 0 ? "+" : ""}${hoverData.pnl.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      {benchmark && (
        <div className="flex items-center gap-4 mt-2 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: strokeColor }} />
            <span className="text-[10px] text-txt-muted">Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[#6366f1] opacity-50" style={{ borderTop: "1px dashed #6366f1" }} />
            <span className="text-[10px] text-txt-muted">{benchmarkLabel} (normalized)</span>
          </div>
        </div>
      )}
    </div>
  );
}
