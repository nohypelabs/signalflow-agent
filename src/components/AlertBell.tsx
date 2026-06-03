"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon } from "@/components/ui/icons";
import type { Alert } from "@/lib/types/alert";

interface Props {
  unreadCount: number;
  triggeredAlerts: Alert[];
  onNavigate: () => void;
}

export default function AlertBell({ unreadCount, triggeredAlerts, onNavigate }: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // No dropdown state needed — just navigate to alerts page

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onNavigate}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
          unreadCount > 0
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-border-default bg-elevated/45 text-txt-muted hover:border-accent/30 hover:bg-accent/10 hover:text-txt-primary"
        }`}
        title="Alerts"
      >
        <BellIcon size={15} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-black"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>
    </div>
  );
}
