"use client";

import Card from "@/components/ui/Card";
import type { SoDEXOrder } from "@/lib/types/trade";

interface Props {
  orders: SoDEXOrder[];
  loading: boolean;
}

function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtPrice(p: string): string {
  const n = parseFloat(p);
  if (isNaN(n)) return "—";
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtQty(q: string): string {
  const n = parseFloat(q);
  if (isNaN(n)) return "—";
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

export default function RecentTrades({ orders, loading }: Props) {
  // Sort by most recent, show last 20
  const sorted = [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  const filledOrders = sorted.filter((o) => o.status === "FILLED");

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-txt-primary">Recent Trades</h3>
          <span className="text-[9px] text-txt-faint font-mono">{filledOrders.length} filled</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 py-1.5 flex items-center gap-2 text-[8px] text-txt-faint uppercase tracking-wider border-b border-border-default">
        <span className="w-10">Side</span>
        <span className="flex-1">Pair</span>
        <span className="flex-1 text-right">Price</span>
        <span className="flex-1 text-right">Amount</span>
        <span className="flex-1 text-right">Status</span>
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
          sorted.map((order) => {
            const isBuy = order.side === "BUY";
            const isFilled = order.status === "FILLED";
            const isCancelled = order.status === "CANCELLED";

            return (
              <div
                key={order.id}
                className="flex items-center gap-2 px-4 py-2 hover:bg-elevated/20 transition-colors font-mono text-[10px]"
              >
                {/* Side */}
                <span className={`w-10 font-bold ${isBuy ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {order.side}
                </span>

                {/* Pair */}
                <span className="flex-1 text-txt-primary">
                  {order.symbol.replace("v", "").replace("_", "/")}
                </span>

                {/* Price */}
                <span className="flex-1 text-right text-txt-secondary">
                  ${fmtPrice(order.price)}
                </span>

                {/* Amount */}
                <span className="flex-1 text-right text-txt-secondary">
                  {fmtQty(order.quantity)}
                </span>

                {/* Status */}
                <span className={`flex-1 text-right font-semibold ${
                  isFilled ? "text-[#00ff88]" : isCancelled ? "text-[#ff4444]" : "text-[#ff8800]"
                }`}>
                  {order.status}
                </span>

                {/* Time */}
                <span className="w-16 text-right text-txt-faint">
                  {fmtTimeAgo(order.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
