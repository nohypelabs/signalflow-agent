"use client";

import { type ReactNode } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface SectionCardProps {
  title?: string;
  badge?: { variant: string; label: string };
  children: ReactNode;
  className?: string;
  accent?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

export default function SectionCard({
  title,
  badge,
  children,
  className = "",
  accent,
  padding = "md",
}: SectionCardProps) {
  return (
    <Card padding={padding} className={className} accent={accent}>
      {(title || badge) && (
        <div className="flex items-center gap-2 mb-3">
          {title && <h3 className="text-sm font-semibold text-txt-primary">{title}</h3>}
          {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
        </div>
      )}
      {children}
    </Card>
  );
}
