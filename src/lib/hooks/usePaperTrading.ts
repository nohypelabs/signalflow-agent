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
  currentPnl: number;         // real-time unrealized P&L (updated on each tick)
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
type CloseReason = "TP" | "SL" | "LIQ" | "MANUAL";

// ── Storage ────────────────────────────────────────────

function isPaperTrade(value: unknown): value is PaperTrade {
  if (!value || typeof value !== "object") return false;
  const trade = value as Partial<PaperTrade>;
  return (
    typeof trade.id === "string" &&
    typeof trade.pair === "string" &&
    (trade.side === "LONG" || trade.side === "SHORT") &&
    typeof trade.leverage === "number" &&
    typeof trade.margin === "number" &&
    typeof trade.entryPrice === "number" &&
    typeof trade.quantity === "number" &&
    typeof trade.notional === "number" &&
    typeof trade.liquidationPrice === "number" &&
    typeof trade.status === "string" &&
    typeof trade.openedAt === "number"
  );
}

function loadFromStorage(): { trades: PaperTrade[]; balance: number } {
  if (typeof window === "undefined") return { trades: [], balance: INITIAL_BALANCE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const trades = Array.isArray(data.trades) ? data.trades.filter(isPaperTrade) : [];
      const balance = Number.isFinite(data.balance) && data.balance > 0 ? data.balance : INITIAL_BALANCE;
      return { trades, balance };
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

function calculatePnl(trade: PaperTrade, exitPrice: number, reason?: CloseReason) {
  const priceChange = trade.side === "LONG"
    ? exitPrice - trade.entryPrice
    : trade.entryPrice - exitPrice;
  const rawPnl = priceChange * trade.quantity;
  const pnl = reason === "LIQ" ? Math.max(rawPnl, -trade.margin) : rawPnl;
  const pnlPercent = trade.margin > 0 ? (pnl / trade.margin) * 100 : 0;
  const roi = trade.entryPrice > 0 ? (priceChange / trade.entryPrice) * 100 : 0;

  return {
    pnl: parseFloat(pnl.toFixed(4)),
    pnlPercent: parseFloat(pnlPercent.toFixed(2)),
    roi: parseFloat(roi.toFixed(2)),
  };
}

function getMarkPrice(currentPrices: Map<string, number>, pair: string): number | null {
  const base = pair.split("/")[0];
  const price = currentPrices.get(base) ?? currentPrices.get(pair);
  return price && Number.isFinite(price) && price > 0 ? price : null;
}

function closePaperTrade(trade: PaperTrade, exitPrice: number, reason: CloseReason, closedAt = Date.now()): PaperTrade {
  const result = calculatePnl(trade, exitPrice, reason);
  return {
    ...trade,
    exitPrice,
    status: `CLOSED_${reason}` as PaperTrade["status"],
    pnl: result.pnl,
    pnlPercent: result.pnlPercent,
    roi: result.roi,
    closedAt,
    currentPnl: result.pnl,
    maxPnl: Math.max(trade.maxPnl, result.pnl),
    minPnl: Math.min(trade.minPnl, result.pnl),
  };
}

function calculateBalance(trades: PaperTrade[], initialBalance: number): PaperBalance {
  const openTradesList = trades.filter((t) => t.status === "OPEN");
  const closedTradesPnl = trades.filter((t) => t.status !== "OPEN").reduce((s, t) => s + (t.pnl ?? 0), 0);
  const marginUsed = openTradesList.reduce((s, t) => s + t.margin, 0);
  const unrealizedPnl = openTradesList.reduce((s, t) => s + (t.currentPnl ?? 0), 0);
  const total = initialBalance + closedTradesPnl + unrealizedPnl;
  const available = total - marginUsed;

  return {
    total: parseFloat(total.toFixed(4)),
    available: parseFloat(Math.max(0, available).toFixed(4)),
    marginUsed: parseFloat(marginUsed.toFixed(4)),
    unrealizedPnl: parseFloat(unrealizedPnl.toFixed(4)),
    initialBalance,
  };
}

function validateTrade(params: {
  side: "LONG" | "SHORT";
  margin: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  available: number;
  liquidationPrice: number;
}): string | null {
  if (!Number.isFinite(params.entryPrice) || params.entryPrice <= 0) return "Market price is not available.";
  if (!Number.isFinite(params.margin) || params.margin <= 0) return "Margin must be greater than 0.";
  if (params.margin > params.available) return "Insufficient paper balance.";

  if (params.takeProfit > 0) {
    if (params.side === "LONG" && params.takeProfit <= params.entryPrice) return "LONG take profit must be above entry price.";
    if (params.side === "SHORT" && params.takeProfit >= params.entryPrice) return "SHORT take profit must be below entry price.";
  }

  if (params.stopLoss > 0) {
    if (params.side === "LONG" && params.stopLoss >= params.entryPrice) return "LONG stop loss must be below entry price.";
    if (params.side === "SHORT" && params.stopLoss <= params.entryPrice) return "SHORT stop loss must be above entry price.";
    if (params.side === "LONG" && params.stopLoss <= params.liquidationPrice) return "LONG stop loss must sit above liquidation price.";
    if (params.side === "SHORT" && params.stopLoss >= params.liquidationPrice) return "SHORT stop loss must sit below liquidation price.";
  }

  return null;
}

// ── Hook ───────────────────────────────────────────────

export function usePaperTrading() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [initialBalance, setInitialBalance] = useState(INITIAL_BALANCE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const liqPrice = calcLiquidationPrice(params.entryPrice, params.side, lev);
    const available = calculateBalance(trades, initialBalance).available;
    const validationError = validateTrade({
      side: params.side,
      margin,
      entryPrice: params.entryPrice,
      takeProfit: params.takeProfit,
      stopLoss: params.stopLoss,
      available,
      liquidationPrice: liqPrice,
    });

    if (validationError) {
      setError(validationError);
      return null;
    }

    const notional = margin * lev;
    const quantity = notional / params.entryPrice;

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
      currentPnl: 0,
    };

    setError(null);
    setTrades((prev) => [trade, ...prev]);
    return trade;
  }, [trades, initialBalance]);

  // ── Close a position ─────────────────────────────────
  const closeTrade = useCallback((tradeId: string, exitPrice: number, reason: CloseReason) => {
    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      setError("Exit price is not available.");
      return;
    }

    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== tradeId || t.status !== "OPEN") return t;
        return closePaperTrade(t, exitPrice, reason);
      }),
    );
    setError(null);
  }, []);

  // ── Check TP/SL/Liquidation for open positions ───────
  const checkTpSl = useCallback((currentPrices: Map<string, number>) => {
    const closedAt = Date.now();
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.status !== "OPEN") return trade;
        const price = getMarkPrice(currentPrices, trade.pair);
        if (!price) return trade;

        if (trade.side === "LONG" && price <= trade.liquidationPrice) {
          return closePaperTrade(trade, trade.liquidationPrice, "LIQ", closedAt);
        }
        if (trade.side === "SHORT" && price >= trade.liquidationPrice) {
          return closePaperTrade(trade, trade.liquidationPrice, "LIQ", closedAt);
        }

        if (trade.takeProfit > 0) {
          if (trade.side === "LONG" && price >= trade.takeProfit) {
            return closePaperTrade(trade, trade.takeProfit, "TP", closedAt);
          }
          if (trade.side === "SHORT" && price <= trade.takeProfit) {
            return closePaperTrade(trade, trade.takeProfit, "TP", closedAt);
          }
        }

        if (trade.stopLoss > 0) {
          if (trade.side === "LONG" && price <= trade.stopLoss) {
            return closePaperTrade(trade, trade.stopLoss, "SL", closedAt);
          }
          if (trade.side === "SHORT" && price >= trade.stopLoss) {
            return closePaperTrade(trade, trade.stopLoss, "SL", closedAt);
          }
        }

        const currentPnl = calculatePnl(trade, price).pnl;
        return {
          ...trade,
          currentPnl,
          maxPnl: Math.max(trade.maxPnl, currentPnl),
          minPnl: Math.min(trade.minPnl, currentPnl),
        };
      }),
    );
  }, []);

  // ── Close position manually ──────────────────────────
  const closeManual = useCallback((tradeId: string, currentPrice: number) => {
    closeTrade(tradeId, currentPrice, "MANUAL");
  }, [closeTrade]);

  // ── Compute balance ──────────────────────────────────
  const openTradesList = trades.filter((t) => t.status === "OPEN");
  const balance = calculateBalance(trades, initialBalance);

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
    error,
    openTrade,
    closeTrade: closeManual,
    checkTpSl,
    reset,
    setBalance,
  };
}
