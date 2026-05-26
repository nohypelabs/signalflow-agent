import type { ChartDrawing } from "./types";

const STORAGE_KEY = "signalflow_chart_drawings";

type DrawingStore = Record<string, ChartDrawing[]>;

function storageKey(pair: string, timeframe: string): string {
  return `${pair}__${timeframe}`;
}

function loadAll(): DrawingStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(store: DrawingStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full — silently fail
  }
}

export function loadDrawings(pair: string, timeframe: string): ChartDrawing[] {
  const store = loadAll();
  return store[storageKey(pair, timeframe)] ?? [];
}

export function saveDrawing(drawing: ChartDrawing): void {
  const store = loadAll();
  const key = storageKey(drawing.pair, drawing.timeframe);
  if (!store[key]) store[key] = [];
  store[key].push(drawing);
  saveAll(store);
}

export function removeDrawing(pair: string, timeframe: string, drawingId: string): void {
  const store = loadAll();
  const key = storageKey(pair, timeframe);
  if (!store[key]) return;
  store[key] = store[key].filter((d) => d.id !== drawingId);
  if (store[key].length === 0) delete store[key];
  saveAll(store);
}

export function clearDrawings(pair: string, timeframe: string): void {
  const store = loadAll();
  const key = storageKey(pair, timeframe);
  delete store[key];
  saveAll(store);
}

export function getDrawingCount(pair: string, timeframe: string): number {
  const store = loadAll();
  return store[storageKey(pair, timeframe)]?.length ?? 0;
}
