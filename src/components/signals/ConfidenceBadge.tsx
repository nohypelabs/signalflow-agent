"use client";

function getConfidenceColor(value: number): { color: string; label: string } {
  if (value >= 85) return { color: "var(--color-info)", label: "High" };
  if (value >= 70) return { color: "var(--color-buy)", label: "Strong" };
  if (value >= 50) return { color: "var(--color-hold)", label: "Moderate" };
  return { color: "var(--text-muted)", label: "Low" };
}

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function ConfidenceBadge({ value, size = "md", showLabel = false, className = "" }: Props) {
  const { color } = getConfidenceColor(value);

  const sizes: Record<string, string> = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-bold rounded-md tabular-nums
        bg-[#ffffff06] border border-border-default
        ${sizes[size]} ${className}
      `}
      style={{ color }}
    >
      {Math.round(value)}%
      {showLabel && (
        <span className="text-[9px] font-normal opacity-70">{getConfidenceColor(value).label}</span>
      )}
    </span>
  );
}
