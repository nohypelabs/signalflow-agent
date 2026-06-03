"use client";

import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { PlusIcon, DocumentIcon } from "@/components/ui/icons";
import JournalEditor from "./JournalEditor";
import JournalEntryCard from "./JournalEntryCard";
import type { JournalEntry, JournalMood } from "@/lib/types/journal";
import { MOOD_CONFIG } from "@/lib/types/journal";

interface Props {
  entries: JournalEntry[];
  allTags: string[];
  tagCounts: { tag: string; count: number }[];
  moodCounts: Record<string, number>;
  uniquePairs: string[];
  onAdd: (data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (id: string, updates: Partial<Omit<JournalEntry, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
}

export default function JournalPage({
  entries,
  allTags,
  tagCounts,
  moodCounts,
  uniquePairs,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [filterPair, setFilterPair] = useState<string | null>(null);

  // Filter + search
  const filtered = useMemo(() => {
    let result = entries;

    if (filterTag) {
      result = result.filter((e) => e.tags.includes(filterTag));
    }
    if (filterMood) {
      result = result.filter((e) => e.mood === filterMood);
    }
    if (filterPair) {
      result = result.filter((e) => e.pair === filterPair);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.notes.toLowerCase().includes(q) ||
          e.pair.toLowerCase().includes(q) ||
          (e.lesson?.toLowerCase().includes(q) ?? false) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [entries, filterTag, filterMood, filterPair, searchQuery]);

  const handleSave = (data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => {
    if (editingEntry) {
      onUpdate(editingEntry.id, data);
    } else {
      onAdd(data);
    }
    setShowEditor(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowEditor(true);
  };

  const clearFilters = () => {
    setFilterTag(null);
    setFilterMood(null);
    setFilterPair(null);
    setSearchQuery("");
  };

  const hasFilters = filterTag || filterMood || filterPair || searchQuery;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-txt-primary">Trade Journal</h2>
          <p className="text-xs text-txt-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {hasFilters && ` · ${filtered.length} shown`}
          </p>
        </div>
        <button
          onClick={() => { setEditingEntry(null); setShowEditor(!showEditor); }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
        >
          <PlusIcon size={14} />
          New Entry
        </button>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {showEditor && (
          <JournalEditor
            initialData={editingEntry ?? undefined}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingEntry(null); }}
          />
        )}
      </AnimatePresence>

      {/* Stats bar */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {/* Mood distribution */}
          <div className="flex items-center gap-2 rounded-lg border border-border-default bg-card px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Mood</span>
            <div className="flex gap-1.5">
              {(Object.keys(MOOD_CONFIG) as JournalMood[]).map((m) => {
                const count = moodCounts[m] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={m}
                    onClick={() => setFilterMood(filterMood === m ? null : m)}
                    title={`${MOOD_CONFIG[m].label}: ${count}`}
                    className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      filterMood === m
                        ? "bg-accent/15 text-accent"
                        : "text-txt-muted hover:text-txt-secondary"
                    }`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: MOOD_CONFIG[m].dotColor }} />
                    {MOOD_CONFIG[m].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top tags */}
          {tagCounts.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border-default bg-card px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Tags</span>
              <div className="flex gap-1">
                {tagCounts.slice(0, 5).map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      filterTag === tag
                        ? "bg-accent/15 text-accent border border-accent/30"
                        : "text-txt-muted hover:text-txt-secondary border border-border-default"
                    }`}
                  >
                    {tag} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pair filter */}
          {uniquePairs.length > 1 && (
            <div className="flex items-center gap-2 rounded-lg border border-border-default bg-card px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Pair</span>
              <div className="flex gap-1">
                {uniquePairs.map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPair(filterPair === p ? null : p)}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      filterPair === p
                        ? "bg-accent/15 text-accent"
                        : "text-txt-muted hover:text-txt-secondary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {entries.length > 0 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, tags, lessons..."
            className="flex-1 rounded-lg border border-border-default bg-card px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="cursor-pointer rounded-lg border border-border-default px-3 py-2 text-xs text-txt-muted hover:bg-elevated hover:text-txt-secondary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-card py-16">
          <DocumentIcon size={32} className="text-txt-faint mb-3" />
          <p className="text-sm font-medium text-txt-muted">
            {entries.length === 0 ? "No journal entries yet" : "No entries match your filters"}
          </p>
          <p className="text-xs text-txt-faint mt-1">
            {entries.length === 0
              ? "Start journaling your trades to build discipline"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
