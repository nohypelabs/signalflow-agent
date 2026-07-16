"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  SignalIcon,
  CloseIcon,
  SidebarCollapseIcon,
} from "@/components/ui/icons";
import type { Signal, SignalAction, SignalActionV2 } from "@/lib/types/signal";

const groups: { label: string; items: { href: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; tour?: string }[] }[] = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/signals", label: "Signals", Icon: SignalIcon, tour: "signals-tab" },
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
  onExpand?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  latestSignal,
  collapsed = false,
  onCollapse,
  onExpand,
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
      className={`flex items-center ${
        collapsed ? "justify-center px-2 py-3" : "justify-between gap-2 px-4 py-4"
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
          </motion.div>
        )}
      </AnimatePresence>
      {collapsed && (
        <motion.button
          onClick={onExpand}
          whileTap={{ scale: 0.92 }}
          className="glass-control flex h-9 w-9 items-center justify-center rounded-[35px] text-txt-muted outline-none transition-colors hover:text-txt-secondary focus-visible:ring-1 focus-visible:ring-white/20"
          title="Expand sidebar"
        >
          <SidebarCollapseIcon size={15} className="rotate-180 opacity-70" />
          <span
            className="absolute h-1.5 w-1.5 translate-x-2.5 translate-y-2.5 rounded-full"
            style={{ backgroundColor: signalColor }}
          />
        </motion.button>
      )}
      {!collapsed && (
        <motion.button
          onClick={onCollapse}
          whileTap={{ scale: 0.92 }}
          className="neu-control flex h-9 w-9 shrink-0 items-center justify-center rounded-[35px] text-txt-muted outline-none transition-colors hover:text-txt-secondary focus-visible:ring-1 focus-visible:ring-white/20"
          title="Collapse sidebar"
        >
          <SidebarCollapseIcon size={15} className="opacity-70" />
        </motion.button>
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
          {group.items.map(({ href, label, Icon, tour }) => {
            const isActive = pathname === href;
            const isHovered = hoveredItem === href;

            return (
              <motion.button
                key={href}
                variants={navItemVariants}
                {...(tour ? { "data-tour": tour } : {})}
                onClick={() => handleNavigate(href)}
                onMouseEnter={() => setHoveredItem(href)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? label : undefined}
                whileTap={{ scale: 0.97 }}
                className={`
                  w-full flex items-center rounded-[35px] relative outline-none
                  ${collapsed
                    ? "justify-center px-0 py-2.5"
                    : "gap-2.5 px-2.5 py-[7px]"
                  }
                  ${isActive
                    ? "text-txt-primary font-medium"
                    : "text-txt-muted hover:text-txt-secondary"
                  }
                  transition-colors duration-150
                  focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0
                `}
                style={{
                  boxShadow: isActive
                    ? "inset 3px 3px 8px rgba(0,0,0,0.45), inset -3px -3px 8px rgba(255,255,255,0.03)"
                    : "none",
                  background: isActive ? "var(--bg-inset)" : "transparent",
                }}
              >
                {/* Icon */}
                <motion.div
                  className="flex items-center justify-center"
                >
                  <Icon
                    size={collapsed ? 16 : 14}
                    className={isActive ? "text-txt-primary" : "text-txt-muted"}
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
                    className="absolute left-full ml-2 z-50 rounded-[35px] px-2.5 py-1.5
                      border border-white/12 bg-elevated/90 shadow-lg shadow-black/30 backdrop-blur-xl
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
        className="shell-glass-panel m-2 mr-0 hidden shrink-0 flex-col overflow-hidden rounded-[35px] border md:flex"
      >
        {brandHeader}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {renderNavItems()}
        </div>
        {!collapsed && (
          <p className="border-t border-white/10 px-3 py-3 text-center text-[9px] text-txt-faint">
            v0.1 Beta · NoHype Labs
          </p>
        )}
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
              className="shell-glass-panel absolute bottom-0 left-0 top-0 flex w-64 flex-col border-r"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-base font-bold text-txt-primary leading-tight tracking-tight">
                    SignalFlow
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
