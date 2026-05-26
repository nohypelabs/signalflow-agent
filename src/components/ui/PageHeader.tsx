"use client";

import { type ReactNode } from "react";
import Badge from "./Badge";

interface Props {
  title: string;
  badge?: { variant: string; label: string };
  actions?: ReactNode;
}

export default function PageHeader({ title, badge, actions }: Props) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border-default mb-4">
      <h2 className="text-lg font-bold text-txt-primary tracking-tight">{title}</h2>
      {badge && <Badge variant={badge.variant} size="md">{badge.label}</Badge>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
