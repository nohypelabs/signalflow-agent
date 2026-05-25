"use client";

const colors: Record<string, string> = {
  live: "var(--color-live)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  offline: "var(--text-dim)",
};

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

interface Props {
  status: string;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function StatusDot({ status, pulse = true, size = "md" }: Props) {
  const color = colors[status] || colors.offline;
  const shouldPulse = pulse && (status === "live");

  return (
    <span
      className={`
        inline-block rounded-full shrink-0 ${sizeMap[size]}
        ${shouldPulse ? "animate-status-pulse" : ""}
      `}
      style={{
        backgroundColor: color,
        "--glow-color": color,
      } as React.CSSProperties}
    />
  );
}
