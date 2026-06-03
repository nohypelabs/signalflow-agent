"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloseIcon } from "@/components/ui/icons";
import type { JournalEntry, JournalMood } from "@/lib/types/journal";
import { MOOD_CONFIG, SUGGESTED_TAGS } from "@/lib/types/journal";

interface Props {
  initialData?: Partial<JournalEntry>;
  onSave: (data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

export default function JournalEditor({ initialData, onSave, onCancel }: Props) {
  const [pair, setPair] = useState(initialData?.pair ?? PAIRS[0]);
  const [side, setSide] = useState<'LONG' | 'SHORT'>(initialData?.side ?? 'LONG');
  const [entryPrice, setEntryPrice] = useState(initialData?.entryPrice?.toString() ?? "");
  const [exitPrice, setExitPrice] = useState(initialData?.exitPrice?.toString() ?? "");
  const [pnl, setPnl] = useState(initialData?.pnl?.toString() ?? "");
  const [mood, setMood] = useState<JournalMood>(initialData?.mood ?? 'neutral');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [lesson, setLesson] = useState(initialData?.lesson ?? "");
  const [tagInput, setTagInput] = useState("");

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const addCustomTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const handleSubmit = () => {
    if (!notes.trim()) return;
    onSave({
      tradeId: initialData?.tradeId,
      pair,
      side,
      entryPrice: entryPrice ? parseFloat(entryPrice) : undefined,
      exitPrice: exitPrice ? parseFloat(exitPrice) : undefined,
      pnl: pnl ? parseFloat(pnl) : undefined,
      tags,
      mood,
      notes: notes.trim(),
      lesson: lesson.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-xl border border-border-default bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-txt-primary">
          {initialData?.id ? "Edit Entry" : "New Journal Entry"}
        </h3>
        <button
          onClick={onCancel}
          className="cursor-pointer text-txt-muted hover:text-txt-primary transition-colors"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      {/* Row 1: Pair + Side + Prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Pair</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary focus:border-accent/50 focus:outline-none"
          >
            {PAIRS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Side</label>
          <div className="mt-1 flex gap-1">
            {(['LONG', 'SHORT'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
                  side === s
                    ? s === 'LONG'
                      ? "bg-buy/15 text-buy border border-buy/30"
                      : "bg-sell/15 text-sell border border-sell/30"
                    : "bg-elevated text-txt-muted border border-border-default hover:text-txt-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Entry Price</label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Exit Price</label>
          <input
            type="number"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Row 2: P&L + Mood */}
      <div className="flex gap-3">
        <div className="w-32 shrink-0">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">P&L (USDC)</label>
          <input
            type="number"
            value={pnl}
            onChange={(e) => setPnl(e.target.value)}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Mood</label>
          <div className="mt-1 flex gap-1">
            {(Object.keys(MOOD_CONFIG) as JournalMood[]).map((m) => {
              const cfg = MOOD_CONFIG[m];
              return (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  title={cfg.label}
                  className={`flex-1 cursor-pointer rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                    mood === m
                      ? "bg-accent/15 border border-accent/30"
                      : "bg-elevated border border-border-default hover:bg-elevated/80"
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cfg.dotColor }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Tags</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SUGGESTED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                tags.includes(tag)
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-elevated text-txt-muted border border-border-default hover:text-txt-secondary"
              }`}
            >
              {tag}
            </button>
          ))}
          {/* Custom tag input */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
              placeholder="custom tag"
              className="w-24 rounded-full border border-border-default bg-elevated px-2.5 py-1 text-[10px] text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
            />
          </div>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="cursor-pointer text-accent/50 hover:text-accent"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
          Notes <span className="text-error">*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened? What did you observe? What was your reasoning?"
          rows={4}
          className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none resize-none"
        />
      </div>

      {/* Lesson */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
          Lesson Learned
        </label>
        <input
          type="text"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="What would you do differently next time?"
          className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 cursor-pointer rounded-lg border border-border-default py-2 text-xs font-medium text-txt-muted hover:bg-elevated hover:text-txt-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!notes.trim()}
          className="flex-1 cursor-pointer rounded-lg bg-accent/15 py-2 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initialData?.id ? "Update Entry" : "Save Entry"}
        </button>
      </div>
    </motion.div>
  );
}
