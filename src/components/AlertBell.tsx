"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { BellIcon, CheckAllIcon, CloseIcon, ExternalLinkIcon } from "@/components/ui/icons";
import type { Alert, PriceAlert, SignalAlert, ManualSignalGeneratedAlert } from "@/lib/types/alert";

interface Props {
  unreadCount: number;
  triggeredAlerts: Alert[];
  activeCount: number;
  onRemove: (id: string) => void;
  onClearTriggered: () => void;
}

export default function AlertBell({
  unreadCount,
  triggeredAlerts,
  activeCount,
  onRemove,
  onClearTriggered,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Reset dismissed when new alerts come in
  useEffect(() => {
    setDismissedIds((prev) => {
      const currentIds = new Set(triggeredAlerts.map((a) => a.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [triggeredAlerts]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleMarkAllRead = useCallback(() => {
    setDismissedIds(new Set(triggeredAlerts.map((a) => a.id)));
  }, [triggeredAlerts]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    router.push("/alerts");
  }, [router]);

  const handleClearTriggered = useCallback(() => {
    onClearTriggered();
    setDismissedIds(new Set());
    setOpen(false);
  }, [onClearTriggered]);

  const visibleAlerts = triggeredAlerts.filter((a) => !dismissedIds.has(a.id));
  const visibleUnread = Math.max(0, unreadCount - dismissedIds.size);
  const hasAlerts = triggeredAlerts.length > 0;

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getAlertDescription = (alert: Alert): string => {
    const isPrice = alert.type === "price_above" || alert.type === "price_below";
    if (isPrice) {
      const pa = alert as PriceAlert;
      return `${pa.type === "price_above" ? "↑ Above" : "↓ Below"} $${pa.targetPrice.toLocaleString()}`;
    }
    if (alert.type === "manual_signal_generated") {
      const ma = alert as ManualSignalGeneratedAlert;
      return `Manual ${ma.action} ${ma.pair} @ ${ma.confidence}%${ma.strategy ? ` (${ma.strategy})` : ''}`;
    }
    const sa = alert as SignalAlert;
    return `${sa.type === "signal_strong" ? "Strong" : "Reversal"}: ${sa.condition}`;
  };

  const getAlertIcon = (alert: Alert): string => {
    if (alert.type === "price_above") return "↑";
    if (alert.type === "price_below") return "↓";
    if (alert.type === "signal_strong") return "⚡";
    if (alert.type === "manual_signal_generated") return "🔔";
    return "↻";
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
          open
            ? "border-accent/50 bg-accent/15 text-accent"
            : visibleUnread > 0
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-border-default bg-elevated/45 text-txt-muted hover:border-accent/30 hover:bg-accent/10 hover:text-txt-primary"
        }`}
        title="Notifications"
        aria-label={`Notifications${visibleUnread > 0 ? ` (${visibleUnread} unread)` : ""}`}
        aria-expanded={open}
      >
        <BellIcon size={15} />
        {visibleUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-black"
          >
            {visibleUnread > 9 ? "9+" : visibleUnread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-border-default bg-card/95 shadow-2xl shadow-black/40"
            style={{ backdropFilter: "blur(16px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-txt-primary">Notifications</h3>
                {visibleUnread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[10px] font-bold text-warning">
                    {visibleUnread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {visibleAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-txt-muted hover:bg-elevated hover:text-txt-primary transition-colors"
                    title="Mark all as read"
                  >
                    <CheckAllIcon size={12} />
                    <span>Read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex cursor-pointer items-center justify-center rounded-md p-1 text-txt-faint hover:text-txt-muted transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon size={13} />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="max-h-80 overflow-y-auto overscroll-contain">
              {triggeredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated/60 mb-3">
                    <BellIcon size={18} className="text-txt-faint" />
                  </div>
                  <p className="text-xs font-medium text-txt-muted">No notifications</p>
                  <p className="text-[11px] text-txt-faint mt-1 text-center">
                    Triggered alerts will appear here
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-txt-faint">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
                    <span>{activeCount} active alert{activeCount !== 1 ? "s" : ""} monitoring</span>
                  </div>
                </div>
              ) : visibleAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 mb-3">
                    <CheckAllIcon size={18} className="text-accent" />
                  </div>
                  <p className="text-xs font-medium text-txt-muted">All caught up</p>
                  <p className="text-[11px] text-txt-faint mt-1">
                    {triggeredAlerts.length} alert{triggeredAlerts.length !== 1 ? "s" : ""} read
                  </p>
                </div>
              ) : (
                <div className="p-1.5">
                  {visibleAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15, delay: index * 0.03 }}
                      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-elevated/50 transition-colors"
                    >
                      {/* Icon */}
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-sm">
                        {getAlertIcon(alert)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-txt-primary">
                            {alert.pair}
                          </span>
                          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning uppercase tracking-wide">
                            Triggered
                          </span>
                        </div>
                        <p className="text-[11px] text-txt-muted mt-0.5 truncate">
                          {getAlertDescription(alert)}
                        </p>
                        <p className="text-[10px] text-txt-faint mt-1">
                          {formatTime(alert.triggeredAt ?? alert.createdAt)}
                        </p>
                      </div>

                      {/* Dismiss button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedIds((prev) => new Set(prev).add(alert.id));
                        }}
                        className="mt-0.5 shrink-0 cursor-pointer rounded-md p-1 text-txt-faint opacity-0 group-hover:opacity-100 hover:bg-elevated hover:text-txt-muted transition-all"
                        title="Dismiss"
                        aria-label={`Dismiss ${alert.pair} alert`}
                      >
                        <CloseIcon size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border-default">
              {triggeredAlerts.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2">
                  <button
                    type="button"
                    onClick={handleClearTriggered}
                    className="cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium text-error/60 hover:bg-error/10 hover:text-error transition-colors"
                  >
                    Clear all
                  </button>
                  <span className="text-[10px] text-txt-faint">
                    {triggeredAlerts.length} total
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleViewAll}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-border-default bg-elevated/30 px-4 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <span>View all alerts</span>
                <ExternalLinkIcon size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
