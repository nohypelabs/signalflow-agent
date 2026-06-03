"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  SignalIcon,
  TradeIcon,
  HistoryIcon,
  StrategyIcon,
  PerformanceIcon,
  SettingsIcon,
  DocsIcon,
  CloseIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  ChartIcon,
  BellIcon,
  DocumentIcon,
} from "@/components/ui/icons";

const groups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/signals", label: "Signals", Icon: SignalIcon },
      { href: "/screener", label: "Market Overview", Icon: HistoryIcon },
      { href: "/performance", label: "Performance", Icon: PerformanceIcon },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/trading", label: "Trading", Icon: TradeIcon },
      { href: "/portfolio", label: "Portfolio", Icon: ChartIcon },
      { href: "/alerts", label: "Alerts", Icon: BellIcon },
      { href: "/journal", label: "Journal", Icon: DocumentIcon },
      { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
      { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
    ],
  },
  {
    label: "System",
    items: [
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
    const allRoutes = groups.flatMap((group) => group.items.map((item) => item.href));
    allRoutes.forEach((href) => router.prefetch(href));
  }, [router]);

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
    <nav className={`flex flex-col gap-0.5 ${collapsed ? "px-2" : "px-3"}`}>
      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="h-px bg-border-default my-3 mx-1" />}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-txt-faint uppercase tracking-[0.18em] font-semibold px-2 pt-3 pb-2"
            >
              {group.label}
            </motion.div>
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
                  w-full flex items-center rounded-lg relative overflow-hidden
                  ${collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-2.5 px-2.5 py-[7px]"
                  }
                  ${isActive
                    ? "text-txt-primary font-medium"
                    : "text-txt-muted hover:text-txt-secondary"
                  }
                  transition-colors duration-150
                `}
              >
                {/* Active background indicator — animated */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-[#ffffff06] rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Active left bar — animated */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className={`absolute ${collapsed ? "left-0" : "left-0"} top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-accent`}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Hover glow background */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-lg bg-[#ffffff03] opacity-0 hover:opacity-100 transition-opacity duration-150" />
                )}

                <Icon size={collapsed ? 16 : 14} className={`relative z-10 ${isActive ? "text-accent" : "opacity-50"}`} />
                {!collapsed && <span className="text-[13px] relative z-10">{label}</span>}
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
      <motion.aside
        animate={{ width: collapsed ? 64 : 192 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="shrink-0 bg-surface border-r border-border-default hidden md:flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto py-3">{menuItems}</div>

        {/* Collapse toggle + version */}
        <div className="border-t border-border-default">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] transition-colors"
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
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[9px] text-txt-faint text-center pb-3 overflow-hidden"
              >
                v0.1 Beta · NoHype Labs
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-default flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-black border border-accent/20 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/icons/signalflow-logo.png"
                      alt="SignalFlow logo"
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
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
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
