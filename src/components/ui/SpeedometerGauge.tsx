"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

// True semicircle: 180° arc, left → right
const sizes = {
  sm: { w: 120, h: 68, cx: 60, cy: 58, r: 44, sw: 5, needleLen: 32, tickLen: 5, labelSize: 14, subSize: 8 },
  md: { w: 180, h: 100, cx: 90, cy: 86, r: 66, sw: 7, needleLen: 48, tickLen: 7, labelSize: 20, subSize: 10 },
  lg: { w: 260, h: 145, cx: 130, cy: 124, r: 96, sw: 9, needleLen: 70, tickLen: 9, labelSize: 30, subSize: 13 },
};

function getColor(v: number): string {
  if (v >= 75) return "var(--color-buy)";
  if (v >= 50) return "var(--color-hold)";
  return "var(--color-sell)";
}

/** Map 0-100 → -180° (left) to 0° (right). Semicircle reads left → right. */
function valueToAngle(v: number): number {
  return -180 + (v / 100) * 180;
}

/** Polar to cartesian (SVG: Y goes down) */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG arc path from startAngle to endAngle */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default function SpeedometerGauge({ value, size = "md", showLabel = true, label }: Props) {
  const { w, h, cx, cy, r, sw, needleLen, tickLen, labelSize, subSize } = sizes[size];
  const clamped = Math.max(0, Math.min(100, value));
  const color = getColor(clamped);

  // Animate needle
  const [displayAngle, setDisplayAngle] = useState(-180);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = valueToAngle(clamped);
    const start = displayAngle;
    const startTime = performance.now();
    const duration = 800;

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayAngle(start + (target - start) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  const needleAngle = displayAngle;
  const needleTip = polar(cx, cy, needleLen, needleAngle);

  // Zone arcs: red (left) → yellow (mid) → green (right)
  const zones = [
    { start: -180, end: -120, color: "var(--color-sell)", opacity: 0.15 },   // 0–33%
    { start: -120, end: -60, color: "var(--color-hold)", opacity: 0.12 },    // 33–67%
    { start: -60, end: 0, color: "var(--color-buy)", opacity: 0.12 },        // 67–100%
  ];

  // Tick marks: major every 25, minor every 5
  const ticks: Array<{ angle: number; major: boolean }> = [];
  for (let v = 0; v <= 100; v += 5) {
    ticks.push({ angle: valueToAngle(v), major: v % 25 === 0 });
  }

  const tickLabels = [0, 25, 50, 75, 100];

  return (
    <span className="inline-flex flex-col items-center">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="shrink-0"
        style={{ filter: "drop-shadow(0 0 8px rgba(0,229,168,0.08))" }}
      >
        <defs>
          <filter id={`needle-glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer bezel */}
        <path
          d={arcPath(cx, cy, r + sw / 2 + 3, -180, 0)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
          opacity="0.25"
        />
        {/* Inner shadow ring */}
        <path
          d={arcPath(cx, cy, r - sw / 2 - 2, -180, 0)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="0.5"
          opacity="0.15"
        />

        {/* Zone arcs (colored bands) */}
        {zones.map((zone) => (
          <path
            key={`${zone.start}-${zone.end}`}
            d={arcPath(cx, cy, r, zone.start, zone.end)}
            fill="none"
            stroke={zone.color}
            strokeWidth={sw + 4}
            strokeLinecap="butt"
            opacity={zone.opacity}
          />
        ))}

        {/* Background track */}
        <path
          d={arcPath(cx, cy, r, -180, 0)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={sw}
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Active filled arc */}
        <path
          d={arcPath(cx, cy, r, -180, displayAngle)}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          style={{ transition: "stroke 0.5s ease" }}
        />

        {/* Tick marks */}
        {ticks.map((tick) => {
          const outerR = r + sw / 2 + 1;
          const innerR = outerR - (tick.major ? tickLen : tickLen * 0.55);
          const outer = polar(cx, cy, outerR, tick.angle);
          const inner = polar(cx, cy, innerR, tick.angle);
          return (
            <line
              key={tick.angle}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={tick.major ? "var(--text-secondary)" : "var(--text-muted)"}
              strokeWidth={tick.major ? 1.5 : 0.8}
              strokeLinecap="round"
              opacity={tick.major ? 0.7 : 0.35}
            />
          );
        })}

        {/* Tick labels */}
        {tickLabels.map((v) => {
          const labelR = r + sw / 2 + tickLen + (size === "sm" ? 6 : 10);
          const pos = polar(cx, cy, labelR, valueToAngle(v));
          return (
            <text
              key={`label-${v}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-muted)"
              fontSize={subSize}
              fontFamily="var(--font-mono)"
              opacity="0.6"
            >
              {v}%
            </text>
          );
        })}

        {/* Center hub — metallic cap */}
        <circle cx={cx} cy={cy} r={size === "sm" ? 5 : 8} fill="var(--bg-card)" stroke="var(--border-default)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={size === "sm" ? 2.5 : 4} fill="var(--bg-elevated)" stroke="var(--border-default)" strokeWidth="0.8" />

        {/* Needle — tapered polygon */}
        {(() => {
          const baseW = size === "sm" ? 4 : 5.5;
          const tailLen = size === "sm" ? 10 : 15;
          const angleRad = (needleAngle * Math.PI) / 180;
          const perpX = -Math.sin(angleRad);
          const perpY = Math.cos(angleRad);
          const tx = needleTip.x, ty = needleTip.y;
          const bx1 = cx + perpX * baseW * 0.35;
          const by1 = cy + perpY * baseW * 0.35;
          const bx2 = cx - perpX * baseW * 0.35;
          const by2 = cy - perpY * baseW * 0.35;
          const twx = cx - Math.cos(angleRad) * tailLen;
          const twy = cy - Math.sin(angleRad) * tailLen;
          return (
            <>
              <polygon
                points={`${tx},${ty} ${bx1},${by1} ${twx},${twy} ${bx2},${by2}`}
                fill={color}
                opacity="0.9"
                filter={`url(#needle-glow-${size})`}
                style={{ transition: "fill 0.5s ease" }}
              />
              <circle cx={tx} cy={ty} r={size === "sm" ? 1.5 : 2} fill="#fff" opacity="0.85" />
            </>
          );
        })()}

        {/* Bottom cap */}
        <circle cx={cx} cy={cy} r={size === "sm" ? 5 : 7} fill="var(--bg-card)" stroke="var(--border-default)" strokeWidth="1.5" />

        {/* Flat bottom line (base of semicircle) */}
        <line
          x1={cx - r - sw / 2 - 1}
          y1={cy}
          x2={cx + r + sw / 2 + 1}
          y2={cy}
          stroke="var(--border-default)"
          strokeWidth="1"
          opacity="0.2"
        />
      </svg>

      {showLabel && (
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: labelSize * 0.6, color }}
          >
            {clamped}%
          </span>
          {label && (
            <span className="text-xs text-txt-tertiary">{label}</span>
          )}
        </div>
      )}
    </span>
  );
}
