"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
    label: "OVERVIEW",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/signals", label: "Signals", Icon: SignalIcon },
      { href: "/performance", label: "Performance", Icon: PerformanceIcon },
    ],
  },
  {
    label: "TRADING",
    items: [
      { href: "/trading", label: "Trading", Icon: TradeIcon },
      { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
      { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/data-sources", label: "Data Sources", Icon: DataSourceIcon },
      { href: "/settings", label: "Settings", Icon: SettingsIcon },
      { href: "/docs", label: "Docs", Icon: DocsIcon },
    ],
  },
];

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

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

  const handleNavigate = (href: string) => {
    router.push(href);
    onMobileClose?.();
  };

  const menuItems = (
    <nav className="flex flex-col gap-0.5 px-2">
      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="h-px bg-border-default my-2 mx-3" />}
          <div className="text-[9px] text-txt-faint uppercase tracking-[0.15em] font-semibold px-3 pt-2 pb-1.5">
            {group.label}
          </div>
          {group.items.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <button
                key={href}
                onClick={() => handleNavigate(href)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all
                  ${isActive
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-txt-muted hover:text-txt-secondary hover:bg-elevated/50"
                  }
                `}
              >
                <Icon size={15} className={isActive ? "text-accent" : "opacity-60"} />
                <span>{label}</span>
                {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-accent" />}
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
      <aside className="w-52 shrink-0 bg-surface border-r border-border-default py-2 hidden md:flex flex-col">
        <div className="flex-1 overflow-y-auto">{menuItems}</div>
        <div className="text-[9px] text-txt-faint px-5 mt-3 pt-3 border-t border-border-default">
          v0.1 Beta · NoHype Labs
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-default animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent-dim flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-txt-primary">SignalFlow</span>
              </div>
              <button
                onClick={onMobileClose}
                className="text-txt-muted hover:text-txt-primary transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-2">{menuItems}</div>
            <div className="text-[9px] text-txt-faint px-5 py-3 border-t border-border-default">
              v0.1 Beta · NoHype Labs
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
