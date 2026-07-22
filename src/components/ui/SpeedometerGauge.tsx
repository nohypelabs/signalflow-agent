"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  sweeping?: boolean;
  color?: string;
}

const sizes = {
  sm: { w: 120, h: 68, cx: 60, cy: 58, r: 44, sw: 5, needleLen: 32, tickLen: 5, labelSize: 14, subSize: 8 },
  md: { w: 180, h: 100, cx: 90, cy: 86, r: 66, sw: 7, needleLen: 48, tickLen: 7, labelSize: 20, subSize: 10 },
  lg: { w: 260, h: 145, cx: 130, cy: 124, r: 96, sw: 9, needleLen: 70, tickLen: 9, labelSize: 30, subSize: 10 },
};

function getColor(v: number): string {
  if (v >= 75) return "var(--color-buy)";
  if (v >= 50) return "var(--color-hold)";
  return "var(--color-sell)";
}

function valueToAngle(v: number): number {
  return -180 + (v / 100) * 180;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default function SpeedometerGauge({ value, size = "md", showLabel = true, label, sweeping = false, color: propColor }: Props) {
  const { w, h, cx, cy, r, sw, needleLen, tickLen, labelSize, subSize } = sizes[size];
  const clamped = Math.max(0, Math.min(100, value));
  const color = propColor || getColor(clamped);

  const [displayAngle, setDisplayAngle] = useState(-180);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (sweeping) return;
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
  }, [clamped, sweeping]);

  useEffect(() => {
    if (!sweeping) return;
    let current = valueToAngle(0);
    const ceiling = valueToAngle(92);
    setDisplayAngle(current);

    function animate() {
      current += 0.55;
      if (current >= ceiling) {
        current = valueToAngle(0);
      }
      setDisplayAngle(current);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [sweeping]);

  const needleAngle = displayAngle;
  const needleTip = polar(cx, cy, needleLen, needleAngle);

  const zones = [
    { start: -180, end: -120, color: "var(--color-sell)", opacity: 0.15 },
    { start: -120, end: -60, color: "var(--color-hold)", opacity: 0.12 },
    { start: -60, end: 0, color: "var(--color-buy)", opacity: 0.12 },
  ];

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
      >
        <defs>
          <filter id={`needle-shadow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5" />
          </filter>

          <linearGradient id={`arc-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>

          <linearGradient id={`bezel-grad-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </linearGradient>

          <linearGradient id={`hub-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
          </linearGradient>

          <radialGradient id={`hub-glow-${size}`} cx="35%" cy="35%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Outer bezel ring */}
        <path
          d={arcPath(cx, cy, r + sw / 2 + 5, -180, 0)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="3"
          opacity="0.4"
        />
        <path
          d={arcPath(cx, cy, r + sw / 2 + 4, -180, 0)}
          fill="none"
          stroke={`url(#bezel-grad-${size})`}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Inner face shadow ring */}
        <path
          d={arcPath(cx, cy, r - sw / 2 - 3, -180, 0)}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1.5"
        />

        {/* Zone arcs */}
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

        {/* Background track with subtle gradient */}
        <path
          d={arcPath(cx, cy, r, -180, 0)}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={sw}
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Active filled arc with gradient */}
        <path
          d={arcPath(cx, cy, r, -180, displayAngle)}
          fill="none"
          stroke={`url(#arc-grad-${size})`}
          strokeWidth={sw}
          strokeLinecap="round"
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
              strokeWidth={tick.major ? 2 : 0.8}
              strokeLinecap="round"
              opacity={tick.major ? 0.7 : 0.3}
            />
          );
        })}

        {/* Tick labels */}
        {tickLabels.map((v) => {
          const labelR = r + sw / 2 + tickLen + (size === "sm" ? 6 : size === "lg" ? 8 : 10);
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

        {/* Needle shadow */}
        {(() => {
          const shadowLen = needleLen * 0.85;
          const shadowAngle = needleAngle + 2;
          const shadowTip = polar(cx, cy, shadowLen, shadowAngle);
          return (
            <line
              x1={cx}
              y1={cy}
              x2={shadowTip.x}
              y2={shadowTip.y}
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={size === "sm" ? 4 : 6}
              strokeLinecap="round"
              opacity="0.4"
            />
          );
        })()}

        {/* Needle */}
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
            <polygon
              points={`${tx},${ty} ${bx1},${by1} ${twx},${twy} ${bx2},${by2}`}
              fill={color}
              opacity="0.95"
              filter={`url(#needle-shadow-${size})`}
            />
          );
        })()}

        {/* Hub — metallic with gradient */}
        <circle cx={cx} cy={cy} r={size === "sm" ? 6 : 9} fill="var(--bg-card)" stroke="var(--border-default)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={size === "sm" ? 5 : 8} fill={`url(#hub-grad-${size})`} />
        <circle cx={cx} cy={cy} r={size === "sm" ? 2.5 : 4} fill="var(--bg-elevated)" stroke="var(--border-default)" strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r={size === "sm" ? 2.5 : 4} fill={`url(#hub-glow-${size})`} />

        {/* Flat bottom base */}
        <line
          x1={cx - r - sw / 2 - 3}
          y1={cy}
          x2={cx + r + sw / 2 + 3}
          y2={cy}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

      </svg>

      {showLabel && (
        <span
          className="mt-1 font-mono font-bold leading-none"
          style={{
            color,
            fontSize: size === "lg" ? 18 : size === "md" ? 13 : 10,
            textShadow: `0 0 6px ${color}`,
          }}
        >
          {clamped}%
        </span>
      )}
    </span>
  );
}
