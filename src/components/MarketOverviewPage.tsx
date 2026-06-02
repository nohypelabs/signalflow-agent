"use client";

import { useState, type ReactNode } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { BarChart3, History } from "lucide-react";

type Tab = "screener" | "history";

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "screener", label: "Screener", icon: <BarChart3 size={14} /> },
  { id: "history", label: "Signal History", icon: <History size={14} /> },
];

export default function MarketOverviewPage({ children }: { children: (tab: Tab) => ReactNode }) {
  const [tab, setTab] = useState<Tab>("screener");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Market Overview"
        badge={{ variant: "accent", label: "LIVE" }}
        actions={
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  tab === t.id
                    ? "bg-accent-muted text-accent border border-accent-dim"
                    : "bg-elevated/30 text-txt-secondary border border-border-default hover:border-border-muted"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        }
      />
      {children(tab)}
    </div>
  );
}
