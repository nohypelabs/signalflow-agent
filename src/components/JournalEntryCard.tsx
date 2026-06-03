"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { JournalEntry } from "@/lib/types/journal";
import { MOOD_CONFIG } from "@/lib/types/journal";

interface Props {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export default function JournalEntryCard({ entry, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const moodCfg = MOOD_CONFIG[entry.mood];
  const hasTradeData = entry.entryPrice || entry.exitPrice || entry.pnl !== undefined;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border-default bg-card overflow-hidden"
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-[#ffffff03] transition-colors"
      >
        {/* Side badge */}
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
            entry.side === "LONG"
              ? "bg-buy/15 text-buy"
              : "bg-sell/15 text-sell"
          }`}
        >
          {entry.side}
        </span>

        {/* Pair */}
        <span className="text-xs font-semibold text-txt-primary">{entry.pair}</span>

        {/* P&L if available */}
        {entry.pnl !== undefined && (
          <span
            className={`text-xs font-mono font-semibold ${
              entry.pnl >= 0 ? "text-buy" : "text-sell"
            }`}
          >
            {entry.pnl >= 0 ? "+" : ""}
            ${entry.pnl.toFixed(2)}
          </span>
        )}

        {/* Mood */}
        <span title={moodCfg.label} className="text-sm">
          {moodCfg.emoji}
        </span>

        {/* Tags preview */}
        {entry.tags.length > 0 && (
          <div className="flex gap-1 min-w-0 overflow-hidden">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[9px] text-txt-muted"
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="shrink-0 text-[9px] text-txt-faint">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date + expand */}
        <span className="ml-auto shrink-0 text-[10px] text-txt-faint">
          {formatDate(entry.createdAt)}
        </span>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0 text-txt-faint"
        >
          <ChevronDownIcon size={14} />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-default px-4 py-3 space-y-3">
              {/* Trade data row */}
              {hasTradeData && (
                <div className="flex flex-wrap gap-4">
                  {entry.entryPrice && (
                    <div>
                      <span className="text-[10px] text-txt-faint">Entry</span>
                      <p className="text-xs font-mono text-txt-primary">
                        ${entry.entryPrice.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {entry.exitPrice && (
                    <div>
                      <span className="text-[10px] text-txt-faint">Exit</span>
                      <p className="text-xs font-mono text-txt-primary">
                        ${entry.exitPrice.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {entry.pnl !== undefined && (
                    <div>
                      <span className="text-[10px] text-txt-faint">P&L</span>
                      <p
                        className={`text-xs font-mono font-semibold ${
                          entry.pnl >= 0 ? "text-buy" : "text-sell"
                        }`}
                      >
                        {entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-txt-faint">Mood</span>
                    <p className={`text-xs ${moodCfg.color}`}>
                      {moodCfg.emoji} {moodCfg.label}
                    </p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-1">
                  Notes
                </p>
                <p className="text-xs text-txt-secondary whitespace-pre-wrap leading-relaxed">
                  {entry.notes}
                </p>
              </div>

              {/* Lesson */}
              {entry.lesson && (
                <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-1">
                    💡 Lesson
                  </p>
                  <p className="text-xs text-txt-secondary">{entry.lesson}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onEdit}
                  className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-xs text-txt-muted hover:bg-elevated hover:text-txt-secondary transition-colors"
                >
                  Edit
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-error">Delete?</span>
                    <button
                      onClick={() => { onDelete(); setConfirmDelete(false); }}
                      className="cursor-pointer rounded-lg bg-error/15 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/25 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-txt-muted hover:text-txt-secondary transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-error/60 hover:bg-error/10 hover:text-error transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
