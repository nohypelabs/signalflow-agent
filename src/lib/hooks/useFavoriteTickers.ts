"use client";

import { useState, useEffect, useCallback } from "react";
import type { SoDEXTicker } from "@/lib/sodex-types";

const STORAGE_KEY = "signalflow_favorite_tickers";
const MAX_FAVORITES = 7;

const DEFAULT_FAVORITES: string[] = ["BTC", "ETH", "SOL"];

export interface FavoriteTicker {
  symbol: string;   // e.g. "BTC"
  pair: string;     // e.g. "BTC/USDC"
  price: number;
  change24h: number;
  lastUpdated: string;
}

function loadFromStorage(): string[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, MAX_FAVORITES);
    return DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

function saveToStorage(symbols: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // storage full or blocked
  }
}

function formatPrice(px: number): number {
  if (px >= 10000) return parseFloat(px.toFixed(2));
  if (px >= 1) return parseFloat(px.toFixed(2));
  return parseFloat(px.toFixed(4));
}

/** Resolve favorite symbols to full ticker data from tickerMap */
function resolveFavorites(symbols: string[], tickerMap?: Map<string, SoDEXTicker>): FavoriteTicker[] {
  const now = new Date().toISOString();
  return symbols.map((sym) => {
    const ticker = tickerMap?.get(`v${sym}_vUSDC`);
    if (ticker) {
      const price = parseFloat(ticker.lastPx);
      return {
        symbol: sym,
        pair: `${sym}/USDC`,
        price: isNaN(price) ? 0 : formatPrice(price),
        change24h: typeof ticker.changePct === "number" && Number.isFinite(ticker.changePct) ? ticker.changePct : 0,
        lastUpdated: now,
      };
    }
    return {
      symbol: sym,
      pair: `${sym}/USDC`,
      price: 0,
      change24h: 0,
      lastUpdated: now,
    };
  });
}

export function useFavoriteTickers(tickerMap?: Map<string, SoDEXTicker>) {
  const [favoriteSymbols, setFavoriteSymbols] = useState<string[]>(DEFAULT_FAVORITES);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setFavoriteSymbols(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist whenever symbols change (skip initial)
  useEffect(() => {
    if (hydrated) saveToStorage(favoriteSymbols);
  }, [favoriteSymbols, hydrated]);

  const isFavorite = useCallback(
    (symbol: string) => favoriteSymbols.includes(symbol),
    [favoriteSymbols],
  );

  const addFavorite = useCallback((symbol: string) => {
    setFavoriteSymbols((prev) => {
      if (prev.includes(symbol) || prev.length >= MAX_FAVORITES) return prev;
      return [...prev, symbol];
    });
  }, []);

  const removeFavorite = useCallback((symbol: string) => {
    setFavoriteSymbols((prev) => prev.filter((s) => s !== symbol));
  }, []);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavoriteSymbols((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= MAX_FAVORITES) return prev;
      return [...prev, symbol];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteSymbols([]);
  }, []);

  const favoriteTickers = resolveFavorites(favoriteSymbols, tickerMap);

  return {
    favoriteSymbols,
    favoriteTickers,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
    hydrated,
  };
}
