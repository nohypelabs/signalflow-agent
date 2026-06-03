"use client";

import { useState, useEffect, useCallback } from "react";
import type { JournalEntry } from "@/lib/types/journal";

const STORAGE_KEY = "signalflow_journal";
const MAX_ENTRIES = 200;

function generateId(): string {
  return `journal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_ENTRIES);
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or blocked
  }
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setEntries(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist whenever entries change (skip initial)
  useEffect(() => {
    if (hydrated) saveToStorage(entries);
  }, [entries, hydrated]);

  const addEntry = useCallback(
    (data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const entry: JournalEntry = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [],
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<Omit<JournalEntry, "id" | "createdAt">>) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e,
        ),
      );
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getByTradeId = useCallback(
    (tradeId: string) => entries.find((e) => e.tradeId === tradeId),
    [entries],
  );

  const search = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return entries;
      return entries.filter(
        (e) =>
          e.notes.toLowerCase().includes(q) ||
          e.pair.toLowerCase().includes(q) ||
          (e.lesson?.toLowerCase().includes(q) ?? false) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    },
    [entries],
  );

  const filterByTag = useCallback(
    (tag: string) => entries.filter((e) => e.tags.includes(tag)),
    [entries],
  );

  const filterByMood = useCallback(
    (mood: string) => entries.filter((e) => e.mood === mood),
    [entries],
  );

  const filterByPair = useCallback(
    (pair: string) => entries.filter((e) => e.pair === pair),
    [entries],
  );

  // Stats
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags)));
  const tagCounts = allTags
    .map((tag) => ({
      tag,
      count: entries.filter((e) => e.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.count - a.count);

  const moodCounts = entries.reduce(
    (acc, e) => {
      acc[e.mood] = (acc[e.mood] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const uniquePairs = Array.from(new Set(entries.map((e) => e.pair)));

  return {
    entries,
    hydrated,
    addEntry,
    updateEntry,
    deleteEntry,
    getByTradeId,
    search,
    filterByTag,
    filterByMood,
    filterByPair,
    allTags,
    tagCounts,
    moodCounts,
    uniquePairs,
  };
}
