"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ──────────────────────────────────────────────

export interface PaperTrade {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  status: "OPEN" | "CLOSED_TP" | "CLOSED_SL" | "CLOSED_MANUAL";
  pnl: number | null;
  pnlPercent: number | null;
  openedAt: number;
  closedAt: number | null;
  signalId: string | null;
  confidence: number;
}

export interface PaperBalance {
  total: number;
  available: number;
  inPositions: number;
  initialBalance: number;
}

export interface PaperStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTime: number;
  profitFactor: number;
}

const STORAGE_KEY = "signalflow-paper-trading";
const INITIAL_BALANCE = 10000;

// ── Storage helpers ────────────────────────────────────

function loadFromStorage(): { trades: PaperTrade[]; balance: number } {
  if (typeof window === "undefined") return { trades: [], balance: INITIAL_BALANCE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { trades: data.trades ?? [], balance: data.balance ?? INITIAL_BALANCE };
    }
  } catch {}
  return { trades: [], balance: INITIAL_BALANCE };
}

function saveToStorage(trades: PaperTrade[], balance: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trades, balance }));
  } catch {}
}

// ── Hook ───────────────────────────────────────────────

export function usePaperTrading() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [initialBalance, setInitialBalance] = useState(INITIAL_BALANCE);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const { trades: saved, balance } = loadFromStorage();
    setTrades(saved);
    setInitialBalance(balance);
    setLoaded(true);
  }, []);

  // Save whenever trades change
  useEffect(() => {
    if (loaded) {
      saveToStorage(trades, initialBalance);
    }
  }, [trades, initialBalance, loaded]);

  // ── Open a paper trade ─────────────────────────────────
  const openTrade = useCallback((params: {
    pair: string;
    side: "BUY" | "SELL";
    entryPrice: number;
    quantity: number;
    takeProfit: number;
    stopLoss: number;
    signalId?: string;
    confidence?: number;
  }): PaperTrade | null => {
    const cost = params.entryPrice * params.quantity;

    // Check available balance
    const openTradesCost = trades
      .filter((t) => t.status === "OPEN" && t.side === "BUY")
      .reduce((s, t) => s + t.entryPrice * t.quantity, 0);
    const available = initialBalance - openTradesCost;

    if (params.side === "BUY" && cost > available) {
      return null; // Insufficient balance
    }

    const trade: PaperTrade = {
      id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pair: params.pair,
      side: params.side,
      entryPrice: params.entryPrice,
      exitPrice: null,
      quantity: params.quantity,
      takeProfit: params.takeProfit,
      stopLoss: params.stopLoss,
      status: "OPEN",
      pnl: null,
      pnlPercent: null,
      openedAt: Date.now(),
      closedAt: null,
      signalId: params.signalId ?? null,
      confidence: params.confidence ?? 0,
    };

    setTrades((prev) => [trade, ...prev]);
    return trade;
  }, [trades, initialBalance]);

  // ── Close a paper trade ────────────────────────────────
  const closeTrade = useCallback((tradeId: string, exitPrice: number, reason: "TP" | "SL" | "MANUAL") => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== tradeId || t.status !== "OPEN") return t;

        const pnl = t.side === "BUY"
          ? (exitPrice - t.entryPrice) * t.quantity
          : (t.entryPrice - exitPrice) * t.quantity;

        const pnlPercent = t.side === "BUY"
          ? ((exitPrice - t.entryPrice) / t.entryPrice) * 100
          : ((t.entryPrice - exitPrice) / t.entryPrice) * 100;

        return {
          ...t,
          exitPrice,
          status: `CLOSED_${reason}` as PaperTrade["status"],
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: parseFloat(pnlPercent.toFixed(2)),
          closedAt: Date.now(),
        };
      }),
    );
  }, []);

  // ── Check TP/SL for open trades ────────────────────────
  const checkTpSl = useCallback((currentPrices: Map<string, number>) => {
    const openTrades = trades.filter((t) => t.status === "OPEN");
    for (const trade of openTrades) {
      const base = trade.pair.split("/")[0];
      const price = currentPrices.get(base) ?? currentPrices.get(trade.pair);
      if (!price) continue;

      if (trade.side === "BUY") {
        if (trade.takeProfit > 0 && price >= trade.takeProfit) {
          closeTrade(trade.id, trade.takeProfit, "TP");
        } else if (trade.stopLoss > 0 && price <= trade.stopLoss) {
          closeTrade(trade.id, trade.stopLoss, "SL");
        }
      } else {
        if (trade.takeProfit > 0 && price <= trade.takeProfit) {
          closeTrade(trade.id, trade.takeProfit, "TP");
        } else if (trade.stopLoss > 0 && price >= trade.stopLoss) {
          closeTrade(trade.id, trade.stopLoss, "SL");
        }
      }
    }
  }, [trades, closeTrade]);

  // ── Compute balance ────────────────────────────────────
  const balance: PaperBalance = {
    total: initialBalance + trades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    available: initialBalance - trades
      .filter((t) => t.status === "OPEN" && t.side === "BUY")
      .reduce((s, t) => s + t.entryPrice * t.quantity, 0),
    inPositions: trades
      .filter((t) => t.status === "OPEN")
      .reduce((s, t) => s + t.entryPrice * t.quantity, 0),
    initialBalance,
  };

  // ── Compute stats ──────────────────────────────────────
  const closedTrades = trades.filter((t) => t.status !== "OPEN");
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) <= 0);
  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));

  const stats: PaperStats = {
    totalTrades: trades.length,
    openTrades: trades.filter((t) => t.status === "OPEN").length,
    closedTrades: closedTrades.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    totalPnl: closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    totalPnlPercent: initialBalance > 0
      ? (closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / initialBalance) * 100
      : 0,
    avgPnl: closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / closedTrades.length
      : 0,
    bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
    worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
    avgHoldTime: closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + ((t.closedAt ?? Date.now()) - t.openedAt), 0) / closedTrades.length
      : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
  };

  // ── Reset paper trading ────────────────────────────────
  const reset = useCallback(() => {
    setTrades([]);
    setInitialBalance(INITIAL_BALANCE);
  }, []);

  // ── Set custom balance ─────────────────────────────────
  const setBalance = useCallback((amount: number) => {
    setInitialBalance(amount);
  }, []);

  return {
    trades,
    balance,
    stats,
    loaded,
    openTrade,
    closeTrade,
    checkTpSl,
    reset,
    setBalance,
  };
}
