"use client";

import { useState, useCallback, useEffect } from "react";

// ── Types ──────────────────────────────────────────────

export interface PaperTrade {
  id: string;
  pair: string;
  side: "LONG" | "SHORT";
  leverage: number;
  margin: number;           // USDC committed
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;         // position size in asset
  notional: number;         // entryPrice * quantity (position value)
  takeProfit: number;
  stopLoss: number;
  liquidationPrice: number;
  status: "OPEN" | "CLOSED_TP" | "CLOSED_SL" | "CLOSED_LIQ" | "CLOSED_MANUAL";
  pnl: number | null;
  pnlPercent: number | null;  // on margin (leveraged)
  roi: number | null;          // on notional (unleveraged)
  openedAt: number;
  closedAt: number | null;
  signalId: string | null;
  confidence: number;
  tradingType?: string;     // scalping | intraday | swing | position
  maxPnl: number;             // peak P&L (for trailing)
  minPnl: number;             // trough P&L
}

export interface PaperBalance {
  total: number;
  available: number;
  marginUsed: number;
  unrealizedPnl: number;
  initialBalance: number;
}

export interface PaperStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  longCount: number;
  shortCount: number;
  winCount: number;
  lossCount: number;
  liqCount: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  avgPnl: number;
  avgLeverage: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTime: number;
  profitFactor: number;
  maxDrawdown: number;
  // Per-type breakdown
  perType?: Record<string, {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgLeverage: number;
  }>;
}

const STORAGE_KEY = "signalflow-paper-futures";
const INITIAL_BALANCE = 10000;

// ── Storage ────────────────────────────────────────────

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

// ── Liquidation price calculation ──────────────────────

function calcLiquidationPrice(
  entryPrice: number,
  side: "LONG" | "SHORT",
  leverage: number,
): number {
  // Simplified: liquidation at ~90% of margin loss
  // Real formula: liq = entry * (1 ± 1/leverage * maintenanceMargin)
  const maintenanceMargin = 0.005; // 0.5%
  if (side === "LONG") {
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
  } else {
    return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
  }
}

// ── Hook ───────────────────────────────────────────────

export function usePaperTrading() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [initialBalance, setInitialBalance] = useState(INITIAL_BALANCE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const { trades: saved, balance } = loadFromStorage();
    setTrades(saved);
    setInitialBalance(balance);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveToStorage(trades, initialBalance);
  }, [trades, initialBalance, loaded]);

  // ── Open a futures position ──────────────────────────
  const openTrade = useCallback((params: {
    pair: string;
    side: "LONG" | "SHORT";
    leverage: number;
    margin: number;         // USDC to commit
    entryPrice: number;
    takeProfit: number;
    stopLoss: number;
    signalId?: string;
    confidence?: number;
    tradingType?: string;
  }): PaperTrade | null => {
    const lev = Math.max(1, Math.min(100, params.leverage));
    const margin = params.margin;

    // Check available balance
    const usedMargin = trades
      .filter((t) => t.status === "OPEN")
      .reduce((s, t) => s + t.margin, 0);
    const available = initialBalance - usedMargin;

    if (margin > available) return null;

    const notional = margin * lev;
    const quantity = notional / params.entryPrice;
    const liqPrice = calcLiquidationPrice(params.entryPrice, params.side, lev);

    const trade: PaperTrade = {
      id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pair: params.pair,
      side: params.side,
      leverage: lev,
      margin,
      entryPrice: params.entryPrice,
      exitPrice: null,
      quantity,
      notional,
      takeProfit: params.takeProfit,
      stopLoss: params.stopLoss,
      liquidationPrice: liqPrice,
      status: "OPEN",
      pnl: null,
      pnlPercent: null,
      roi: null,
      openedAt: Date.now(),
      closedAt: null,
      signalId: params.signalId ?? null,
      confidence: params.confidence ?? 0,
      tradingType: params.tradingType,
      maxPnl: 0,
      minPnl: 0,
    };

    setTrades((prev) => [trade, ...prev]);
    return trade;
  }, [trades, initialBalance]);

  // ── Close a position ─────────────────────────────────
  const closeTrade = useCallback((tradeId: string, exitPrice: number, reason: "TP" | "SL" | "LIQ" | "MANUAL") => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== tradeId || t.status !== "OPEN") return t;

        // P&L calculation (futures)
        const priceChange = t.side === "LONG"
          ? exitPrice - t.entryPrice
          : t.entryPrice - exitPrice;

        const pnl = priceChange * t.quantity; // in USDC
        const pnlPercent = (pnl / t.margin) * 100; // ROI on margin
        const roi = (priceChange / t.entryPrice) * 100; // unleveraged return

        return {
          ...t,
          exitPrice,
          status: `CLOSED_${reason}` as PaperTrade["status"],
          pnl: parseFloat(pnl.toFixed(4)),
          pnlPercent: parseFloat(pnlPercent.toFixed(2)),
          roi: parseFloat(roi.toFixed(2)),
          closedAt: Date.now(),
        };
      }),
    );
  }, []);

  // ── Check TP/SL/Liquidation for open positions ───────
  const checkTpSl = useCallback((currentPrices: Map<string, number>) => {
    const openTrades = trades.filter((t) => t.status === "OPEN");
    for (const trade of openTrades) {
      const base = trade.pair.split("/")[0];
      const price = currentPrices.get(base) ?? currentPrices.get(trade.pair);
      if (!price) continue;

      // Check liquidation first
      if (trade.side === "LONG" && price <= trade.liquidationPrice) {
        closeTrade(trade.id, trade.liquidationPrice, "LIQ");
        continue;
      }
      if (trade.side === "SHORT" && price >= trade.liquidationPrice) {
        closeTrade(trade.id, trade.liquidationPrice, "LIQ");
        continue;
      }

      // Check TP
      if (trade.takeProfit > 0) {
        if (trade.side === "LONG" && price >= trade.takeProfit) {
          closeTrade(trade.id, trade.takeProfit, "TP");
          continue;
        }
        if (trade.side === "SHORT" && price <= trade.takeProfit) {
          closeTrade(trade.id, trade.takeProfit, "TP");
          continue;
        }
      }

      // Check SL
      if (trade.stopLoss > 0) {
        if (trade.side === "LONG" && price <= trade.stopLoss) {
          closeTrade(trade.id, trade.stopLoss, "SL");
          continue;
        }
        if (trade.side === "SHORT" && price >= trade.stopLoss) {
          closeTrade(trade.id, trade.stopLoss, "SL");
          continue;
        }
      }

      // Track max/min P&L
      const priceChange = trade.side === "LONG"
        ? price - trade.entryPrice
        : trade.entryPrice - price;
      const currentPnl = priceChange * trade.quantity;
      setTrades((prev) =>
        prev.map((t) =>
          t.id === trade.id
            ? { ...t, maxPnl: Math.max(t.maxPnl, currentPnl), minPnl: Math.min(t.minPnl, currentPnl) }
            : t
        )
      );
    }
  }, [trades, closeTrade]);

  // ── Close position manually ──────────────────────────
  const closeManual = useCallback((tradeId: string, currentPrice: number) => {
    closeTrade(tradeId, currentPrice, "MANUAL");
  }, [closeTrade]);

  // ── Compute balance ──────────────────────────────────
  const openTradesList = trades.filter((t) => t.status === "OPEN");
  const marginUsed = openTradesList.reduce((s, t) => s + t.margin, 0);
  const unrealizedPnl = 0; // calculated on each tick in component

  const balance: PaperBalance = {
    total: initialBalance + trades.filter((t) => t.status !== "OPEN").reduce((s, t) => s + (t.pnl ?? 0), 0),
    available: initialBalance - marginUsed,
    marginUsed,
    unrealizedPnl,
    initialBalance,
  };

  // ── Compute stats ────────────────────────────────────
  const closedTrades = trades.filter((t) => t.status !== "OPEN");
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) <= 0 && t.status !== "CLOSED_LIQ");
  const liqs = closedTrades.filter((t) => t.status === "CLOSED_LIQ");
  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0)) + Math.abs(liqs.reduce((s, t) => s + (t.pnl ?? 0), 0));

  const stats: PaperStats = {
    totalTrades: trades.length,
    openTrades: openTradesList.length,
    closedTrades: closedTrades.length,
    longCount: trades.filter((t) => t.side === "LONG").length,
    shortCount: trades.filter((t) => t.side === "SHORT").length,
    winCount: wins.length,
    lossCount: losses.length + liqs.length,
    liqCount: liqs.length,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    totalPnl: closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    totalPnlPercent: initialBalance > 0
      ? (closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / initialBalance) * 100
      : 0,
    avgPnl: closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) / closedTrades.length
      : 0,
    avgLeverage: trades.length > 0
      ? trades.reduce((s, t) => s + t.leverage, 0) / trades.length
      : 0,
    bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
    worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl ?? 0)) : 0,
    avgHoldTime: closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + ((t.closedAt ?? Date.now()) - t.openedAt), 0) / closedTrades.length
      : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown: trades.length > 0 ? Math.min(...trades.map((t) => t.minPnl)) : 0,
    // Per-type breakdown
    perType: (() => {
      const types = ["scalping", "intraday", "swing", "position"];
      const result: Record<string, { trades: number; wins: number; losses: number; winRate: number; totalPnl: number; avgLeverage: number }> = {};
      for (const type of types) {
        const typeTrades = trades.filter((t) => t.tradingType === type);
        const typeClosed = typeTrades.filter((t) => t.status !== "OPEN");
        const typeWins = typeClosed.filter((t) => (t.pnl ?? 0) > 0);
        const typeLosses = typeClosed.filter((t) => (t.pnl ?? 0) <= 0);
        if (typeTrades.length > 0) {
          result[type] = {
            trades: typeTrades.length,
            wins: typeWins.length,
            losses: typeLosses.length,
            winRate: typeClosed.length > 0 ? parseFloat(((typeWins.length / typeClosed.length) * 100).toFixed(1)) : 0,
            totalPnl: parseFloat(typeClosed.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2)),
            avgLeverage: typeTrades.length > 0 ? parseFloat((typeTrades.reduce((s, t) => s + t.leverage, 0) / typeTrades.length).toFixed(1)) : 0,
          };
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    })(),
  };

  const reset = useCallback(() => {
    setTrades([]);
    setInitialBalance(INITIAL_BALANCE);
  }, []);

  const setBalance = useCallback((amount: number) => {
    setInitialBalance(amount);
  }, []);

  return {
    trades,
    balance,
    stats,
    loaded,
    openTrade,
    closeTrade: closeManual,
    checkTpSl,
    reset,
    setBalance,
  };
}
