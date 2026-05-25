"use client";

const variants: Record<string, string> = {
  text: "h-4 rounded w-24",
  "text-sm": "h-3 rounded w-16",
  card: "h-32 rounded-xl w-full",
  "card-sm": "h-20 rounded-xl w-full",
  "table-row": "h-10 rounded-lg w-full",
  circle: "w-8 h-8 rounded-full",
};

interface Props {
  variant?: string;
  className?: string;
}

export default function Skeleton({ variant = "text", className = "" }: Props) {
  return (
    <div className={`animate-shimmer ${variants[variant] || variants.text} ${className}`} />
  );
}
