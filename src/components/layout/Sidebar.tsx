"use client";

import { useState, useEffect } from "react";
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
  SidebarCollapseIcon,
  SidebarExpandIcon,
} from "@/components/ui/icons";

const groups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/signals", label: "Signals", Icon: SignalIcon },
      { href: "/performance", label: "Performance", Icon: PerformanceIcon },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/trading", label: "Trading", Icon: TradeIcon },
      { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
      { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
    ],
  },
  {
    label: "System",
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
  const [collapsed, setCollapsed] = useState(false);

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
    <nav className={`flex flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}>
      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="h-px bg-border-default my-3 mx-1" />}
          {!collapsed && (
            <div className="text-[10px] text-txt-faint uppercase tracking-[0.18em] font-semibold px-2 pt-3 pb-2">
              {group.label}
            </div>
          )}
          {collapsed && gi > 0 && <div className="h-1" />}
          {group.items.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <button
                key={href}
                onClick={() => handleNavigate(href)}
                title={collapsed ? label : undefined}
                className={`
                  w-full flex items-center rounded-md transition-all relative
                  ${collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-2.5 px-2.5 py-[7px]"
                  }
                  ${isActive
                    ? "text-txt-primary font-medium bg-[#ffffff06]"
                    : "text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04]"
                  }
                `}
              >
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-accent" />
                )}
                {isActive && collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-accent" />
                )}
                <Icon size={collapsed ? 16 : 14} className={isActive ? "text-accent" : "opacity-50"} />
                {!collapsed && <span className="text-[13px]">{label}</span>}
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
      <aside
        className={`
          shrink-0 bg-surface border-r border-border-default hidden md:flex flex-col
          transition-all duration-200 ease-out
          ${collapsed ? "w-16" : "w-48"}
        `}
      >
        <div className="flex-1 overflow-y-auto py-3">{menuItems}</div>

        {/* Collapse toggle + version */}
        <div className="border-t border-border-default">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              w-full flex items-center gap-2 px-3 py-2.5 text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] transition-colors
              ${collapsed ? "justify-center" : ""}
            `}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <SidebarExpandIcon size={15} className="opacity-60" />
            ) : (
              <>
                <SidebarCollapseIcon size={15} className="opacity-60" />
                <span className="text-[11px]">Collapse</span>
              </>
            )}
          </button>
          {!collapsed && (
            <div className="text-[9px] text-txt-faint px-5 pb-3">
              v0.1 Beta · NoHype Labs
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-default animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
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
            <div className="flex-1 overflow-y-auto pt-3">{menuItems}</div>
            <div className="text-[9px] text-txt-faint px-5 py-3 border-t border-border-default">
              v0.1 Beta · NoHype Labs
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
