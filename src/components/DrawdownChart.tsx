"use client";

import { useMemo, useState, useRef, useCallback } from "react";

interface DataPoint {
  date: number;
  drawdown: number;
  drawdownPct: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export default function DrawdownChart({ data, height = 180 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const padding = { top: 12, right: 16, bottom: 24, left: 50 };
  const chartWidth = 800;
  const chartHeight = height;
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const { areaD, yMin, points } = useMemo(() => {
    if (data.length < 2) {
      return { areaD: "", yMin: 0, points: [] };
    }

    const ddValues = data.map((d) => d.drawdownPct);
    const minVal = Math.min(...ddValues, 0);
    const maxVal = 0;
    const range = maxVal - minVal || 0.01;

    const xScale = (i: number) =>
      padding.left + (i / (data.length - 1)) * innerW;
    const yScale = (v: number) =>
      padding.top + ((maxVal - v) / range) * innerH;

    const pts = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.drawdownPct),
      data: d,
    }));

    const baseline = yScale(0);
    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const area = `${line} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;

    return { areaD: area, yMin: minVal, points: pts };
  }, [data, innerW, innerH, padding.left, padding.top]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * chartWidth;
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
    [points],
  );

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const count = 4;
    const step = (0 - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const val = yMin + step * i;
      const y =
        padding.top + innerH - ((val - yMin) / (0 - yMin)) * innerH;
      return { value: val, y };
    });
  }, [yMin, innerH, padding.top]);

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-txt-faint"
        style={{ height }}
      >
        Not enough data for drawdown chart
      </div>
    );
  }

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="dd-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid */}
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
              {(tick.value * 100).toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={chartWidth - padding.right}
          y2={padding.top}
          stroke="#1E293B"
          strokeWidth={1}
        />

        {/* Area */}
        <path d={areaD} fill="url(#dd-gradient)" />
        <path d={areaD} fill="none" stroke="#ff4444" strokeWidth={1.5} />

        {/* Hover */}
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
              r={3}
              fill="#ff4444"
              stroke="#0B1020"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

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
          <p className="text-xs font-mono font-semibold text-sell">
            {(hoverData.drawdownPct * 100).toFixed(2)}%
          </p>
        </div>
      )}
    </div>
  );
}
