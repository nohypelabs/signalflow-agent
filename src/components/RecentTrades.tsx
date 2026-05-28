"use client";

import Card from "@/components/ui/Card";
import type { SoDEXOrder } from "@/lib/types/trade";
import type { PaperTrade } from "@/lib/hooks/usePaperTrading";

interface Props {
  orders: SoDEXOrder[];
  loading: boolean;
  paperTrades?: PaperTrade[];
}

type RecentTradeItem = {
  id: string;
  source: "Paper" | "Live";
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  pair: string;
  price: number;
  amount: number;
  status: string;
  timestamp: number;
  pnl?: number;
  pnlPercent?: number;
};

function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtPrice(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "—";
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  return p.toFixed(4);
}

function fmtQty(q: number): string {
  if (!Number.isFinite(q) || q <= 0) return "—";
  if (q >= 1) return q.toFixed(4);
  return q.toFixed(6);
}

function fmtPair(symbol: string): string {
  return symbol.replace(/^v/, "").replace("_v", "/").replace("_", "/");
}

function paperStatus(status: PaperTrade["status"]): string {
  return status.replace("CLOSED_", "");
}

export default function RecentTrades({ orders, loading, paperTrades = [] }: Props) {
  const liveItems: RecentTradeItem[] = orders
    .filter((order) => order.status !== "NEW" && order.status !== "PARTIALLY_FILLED")
    .map((order) => ({
      id: `live-${order.id}`,
      source: "Live",
      side: order.side,
      pair: fmtPair(order.symbol),
      price: parseFloat(order.price),
      amount: parseFloat(order.executedQty || order.quantity),
      status: order.status,
      timestamp: order.updatedAt || order.createdAt,
    }));

  const paperItems: RecentTradeItem[] = paperTrades
    .filter((trade) => trade.status !== "OPEN")
    .map((trade) => ({
      id: trade.id,
      source: "Paper",
      side: trade.side,
      pair: trade.pair,
      price: trade.exitPrice ?? trade.entryPrice,
      amount: trade.quantity,
      status: paperStatus(trade.status),
      timestamp: trade.closedAt ?? trade.openedAt,
      pnl: trade.pnl ?? 0,
      pnlPercent: trade.pnlPercent ?? 0,
    }));

  const sorted = [...paperItems, ...liveItems]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  const filledCount = sorted.filter((item) => item.status === "FILLED" || item.source === "Paper").length;

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-txt-primary">Recent Trades</h3>
          <span className="text-[9px] text-txt-faint font-mono">{filledCount} recent</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 py-1.5 flex items-center gap-2 text-[8px] text-txt-faint uppercase tracking-wider border-b border-border-default">
        <span className="w-10">Side</span>
        <span className="flex-1">Pair</span>
        <span className="flex-1 text-right">Price</span>
        <span className="flex-1 text-right">Amount</span>
        <span className="flex-1 text-right">Result</span>
        <span className="w-16 text-right">Time</span>
      </div>

      {/* Trades */}
      <div className="max-h-64 overflow-y-auto">
        {loading && sorted.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-txt-muted">Loading trades...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-8 h-8 rounded-full bg-elevated mx-auto mb-3 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <p className="text-xs text-txt-muted">No trades yet</p>
            <p className="text-[10px] text-txt-faint mt-1">Execute a trade to see history here</p>
          </div>
        ) : (
          sorted.map((trade) => {
            const isBuy = trade.side === "BUY" || trade.side === "LONG";
            const isProfit = (trade.pnl ?? 0) >= 0;
            const isCancelled = trade.status === "CANCELLED" || trade.status === "REJECTED";

            return (
              <div
                key={trade.id}
                className="flex items-center gap-2 px-4 py-2 hover:bg-elevated/20 transition-colors font-mono text-[10px]"
              >
                {/* Side */}
                <span className={`w-10 font-bold ${isBuy ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {trade.side}
                </span>

                {/* Pair */}
                <span className="flex-1 text-txt-primary">{trade.pair}</span>

                {/* Price */}
                <span className="flex-1 text-right text-txt-secondary">
                  ${fmtPrice(trade.price)}
                </span>

                {/* Amount */}
                <span className="flex-1 text-right text-txt-secondary">
                  {fmtQty(trade.amount)}
                </span>

                {/* Result */}
                <span className={`flex-1 text-right font-semibold ${
                  trade.source === "Paper"
                    ? isProfit ? "text-[#00ff88]" : "text-[#ff4444]"
                    : isCancelled ? "text-[#ff4444]" : "text-[#00ff88]"
                }`}>
                  {trade.source === "Paper"
                    ? `${isProfit ? "+" : ""}$${Math.abs(trade.pnl ?? 0).toFixed(2)}`
                    : trade.status}
                </span>

                {/* Time */}
                <span className="w-16 text-right text-txt-faint">
                  {fmtTimeAgo(trade.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
