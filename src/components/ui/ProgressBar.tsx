"use client";

const heights = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

interface Props {
  value: number;
  color: string;
  height?: "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  color,
  height = "md",
  label,
  showValue = false,
  animated = true,
  className = "",
}: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-[10px] text-txt-tertiary w-[4.5rem] shrink-0 truncate">
          {label}
        </span>
      )}
      <div className={`flex-1 ${heights[height]} bg-border-default rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${animated ? "transition-all duration-700" : ""}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
      {showValue && (
        <span
          className="text-[10px] w-7 text-right font-semibold tabular-nums shrink-0"
          style={{ color }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
