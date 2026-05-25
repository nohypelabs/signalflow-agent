"use client";

import { useEffect } from "react";
import {
  HomeIcon,
  SignalIcon,
  TradeIcon,
  HistoryIcon,
  StrategyIcon,
  DataSourceIcon,
  PerformanceIcon,
  SettingsIcon,
  DocsIcon,
  CloseIcon,
} from "@/components/ui/icons";

const groups = [
  {
    label: "ANALYTICS",
    items: [
      { id: "Dashboard", label: "Dashboard", Icon: HomeIcon },
      { id: "Signals", label: "Signals", Icon: SignalIcon },
      { id: "Performance", label: "Performance", Icon: PerformanceIcon },
    ],
  },
  {
    label: "TRADING",
    items: [
      { id: "Trading", label: "Trading", Icon: TradeIcon },
      { id: "Trade History", label: "Trade History", Icon: HistoryIcon },
      { id: "Strategy Config", label: "Strategy Config", Icon: StrategyIcon },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "Data Sources", label: "Data Sources", Icon: DataSourceIcon },
      { id: "Settings", label: "Settings", Icon: SettingsIcon },
      { id: "Docs", label: "Docs", Icon: DocsIcon },
    ],
  },
];

interface Props {
  active: string;
  onSelect: (item: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ active, onSelect, mobileOpen, onMobileClose }: Props) {
  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleSelect = (item: string) => {
    onSelect(item);
    onMobileClose?.();
  };

  const menuItems = (
    <nav className="flex flex-col gap-0.5">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="text-[9px] text-txt-faint uppercase tracking-widest font-semibold px-5 pt-4 pb-1">
            {group.label}
          </div>
          {group.items.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`
                  w-full flex items-center gap-3 px-5 py-2 text-sm transition-colors border-l-2
                  ${isActive
                    ? "bg-accent-muted text-accent rounded-r-lg border-l-accent"
                    : "text-txt-muted hover:bg-elevated hover:text-txt-secondary border-transparent"
                  }
                `}
              >
                <Icon size={16} className={isActive ? "text-accent" : ""} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-52 shrink-0 bg-surface border-r border-border-default py-3 hidden md:flex flex-col">
        <div className="flex-1">{menuItems}</div>
        <div className="text-[9px] text-txt-faint px-5 mt-4">v0.1 Beta</div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-surface border-r border-border-default py-4 animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between px-5 mb-3">
              <span className="text-sm font-bold text-txt-primary">Menu</span>
              <button
                onClick={onMobileClose}
                className="text-txt-muted hover:text-txt-primary transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{menuItems}</div>
            <div className="text-[9px] text-txt-faint px-5 mt-4">v0.1 Beta</div>
          </aside>
        </div>
      )}
    </>
  );
}
