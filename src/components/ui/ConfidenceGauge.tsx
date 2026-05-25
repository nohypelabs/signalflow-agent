"use client";

const sizes = {
  sm: { w: 28, h: 16, r: 10, sw: 3 },
  md: { w: 44, h: 24, r: 16, sw: 4 },
  lg: { w: 60, h: 32, r: 22, sw: 5 },
};

function getColor(v: number): string {
  if (v >= 75) return "var(--color-buy)";
  if (v >= 50) return "var(--color-hold)";
  return "var(--color-sell)";
}

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ConfidenceGauge({ value, size = "md", showLabel = true }: Props) {
  const { w, h, r, sw } = sizes[size];
  const cx = w / 2;
  const cy = h - 2;
  const circ = Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = getColor(value);

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(180 ${cx} ${cy})`}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(180 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
        />
      </svg>
      {showLabel && (
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {value}%
        </span>
      )}
    </span>
  );
}
