"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChartIcon,
  BellIcon,
  DocumentIcon,
  BarChartIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import type { Signal, SignalAction, SignalActionV2 } from "@/lib/types/signal";

const groups = [
  {
    label: "Command",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/signals", label: "Signals", Icon: SignalIcon },
      { href: "/screener", label: "Market Overview", Icon: HistoryIcon },
    ],
  },
  {
    label: "Execution",
    items: [
      { href: "/trading", label: "Trading", Icon: TradeIcon },
      { href: "/portfolio", label: "Portfolio", Icon: ChartIcon },
      { href: "/alerts", label: "Alerts", Icon: BellIcon },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/performance", label: "Performance", Icon: PerformanceIcon },
      { href: "/analytics", label: "Analytics", Icon: BarChartIcon },
      { href: "/trade-history", label: "Trade History", Icon: HistoryIcon },
      { href: "/journal", label: "Journal", Icon: DocumentIcon },
    ],
  },
  {
    label: "Strategy",
    items: [
      { href: "/strategy-config", label: "Strategy Config", Icon: StrategyIcon },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", Icon: SettingsIcon },
      { href: "/api-keys", label: "API Keys", Icon: ShieldIcon },
      { href: "/docs", label: "Docs", Icon: DocsIcon },
    ],
  },
];

/* ── Animation variants ── */
const navContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 500, damping: 30 },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.1 } },
};

const groupLabelVariants = {
  hidden: { opacity: 0, x: -6 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

const separatorVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: {
    scaleX: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25, delay: 0.1 },
  },
  exit: { scaleX: 0, opacity: 0, transition: { duration: 0.1 } },
};

/* ── Signal action → dot color ── */
function getSignalColor(action?: SignalAction | SignalActionV2): string {
  if (!action) return "var(--text-dim)";
  if (action.includes("LONG")) return "var(--color-buy)";
  if (action.includes("SHORT")) return "var(--color-sell)";
  return "var(--color-hold)";
}

interface Props {
  latestSignal?: Signal | null;
  collapsed?: boolean;
  onCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  latestSignal,
  collapsed = false,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const signalColor = getSignalColor(latestSignal?.actionV2 ?? latestSignal?.action);

  useEffect(() => {
    const timer = setTimeout(() => setHasMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const allRoutes = groups.flatMap((group) =>
      group.items.map((item) => item.href)
    );
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

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      onMobileClose?.();
    },
    [router, onMobileClose]
  );

  /* ── Brand header ── */
  const brandHeader = (
    <div
      className={`flex items-center justify-center border-b border-border-default ${
        collapsed ? "px-2 py-3" : "px-4 py-4"
      }`}
    >
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center overflow-hidden"
          >
            <span className="text-base font-bold text-txt-primary leading-tight tracking-tight">
              SignalFlow
            </span>
            <span className="text-[7px] text-accent font-semibold tracking-[0.2em] uppercase">
              Agent
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {collapsed && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: signalColor }}
        />
      )}
    </div>
  );

  /* ── Nav items ── */
  const renderNavItems = () => (
    <motion.nav
      className={`flex flex-col gap-0.5 ${collapsed ? "px-2" : "px-3"}`}
      variants={navContainerVariants}
      initial={hasMounted ? "show" : "hidden"}
      animate="show"
      exit="exit"
      key={`nav-${collapsed ? "c" : "e"}`}
    >
      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && (
            <motion.div
              variants={separatorVariants}
              className="h-px bg-border-default my-3 mx-1 origin-left"
            />
          )}
          {!collapsed && (
            <motion.div
              variants={groupLabelVariants}
              className="text-[10px] text-txt-faint uppercase tracking-[0.18em] font-semibold px-2 pt-3 pb-2"
            >
              {group.label}
            </motion.div>
          )}
          {collapsed && gi > 0 && <div className="h-1" />}
          {group.items.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            const isHovered = hoveredItem === href;

            return (
              <motion.button
                key={href}
                variants={navItemVariants}
                onClick={() => handleNavigate(href)}
                onMouseEnter={() => setHoveredItem(href)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? label : undefined}
                whileTap={{ scale: 0.97 }}
                className={`
                  w-full flex items-center rounded-lg relative overflow-hidden outline-none
                  ${collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-2.5 px-2.5 py-[7px]"
                  }
                  ${isActive
                    ? "text-txt-primary font-medium"
                    : "text-txt-muted hover:text-txt-secondary"
                  }
                  transition-colors duration-150
                  focus-visible:ring-1 focus-visible:ring-accent/50 focus-visible:ring-offset-0
                `}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(0,229,168,0.08) 0%, rgba(0,229,168,0.02) 100%)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Hover glow */}
                {!isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      background:
                        "radial-gradient(ellipse at left center, rgba(0,229,168,0.06) 0%, transparent 70%)",
                    }}
                  />
                )}

                {/* Active left bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  className="relative z-10 flex items-center justify-center"
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    size={collapsed ? 16 : 14}
                    className={isActive ? "text-accent" : "opacity-50"}
                  />
                </motion.div>

                {/* Label */}
                {!collapsed && (
                  <span className="text-[13px] relative z-10 whitespace-nowrap">
                    {label}
                  </span>
                )}

                {/* Collapsed tooltip */}
                {collapsed && isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-full ml-2 z-50 px-2.5 py-1.5 rounded-md
                      bg-elevated border border-border-muted shadow-lg shadow-black/30
                      text-[12px] text-txt-primary font-medium whitespace-nowrap pointer-events-none"
                  >
                    {label}
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-elevated border-l border-b border-border-muted" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      ))}
    </motion.nav>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 212 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="shrink-0 bg-surface border-r border-border-default hidden md:flex flex-col overflow-hidden"
      >
        {brandHeader}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {renderNavItems()}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="border-t border-border-default overflow-hidden"
            >
              <motion.button
                onClick={onCollapse}
                whileTap={{ scale: 0.95 }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-txt-muted hover:text-txt-secondary hover:bg-[#ffffff04] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
                title="Collapse sidebar"
              >
                <SidebarCollapseIcon size={15} className="opacity-60" />
                <span className="text-[11px]">Collapse</span>
              </motion.button>
              <p className="text-[9px] text-txt-faint text-center pb-3">
                v0.1 Beta · NoHype Labs
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ── Mobile drawer ── */}
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
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-base font-bold text-txt-primary leading-tight tracking-tight">
                    SignalFlow
                  </span>
                  <span className="text-[7px] text-accent font-semibold tracking-[0.2em] uppercase">
                    Agent
                  </span>
                </div>
                <motion.button
                  onClick={onMobileClose}
                  whileTap={{ scale: 0.9 }}
                  className="text-txt-muted hover:text-txt-primary transition-colors p-1 rounded-md hover:bg-[#ffffff08] outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
                >
                  <CloseIcon size={18} />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto pt-3">
                {renderNavItems()}
              </div>
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
