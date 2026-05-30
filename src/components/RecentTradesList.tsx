"use client";

import { useRecentTrades } from "@/lib/hooks/useRecentTrades";
import type { SoDEXTrade } from "@/lib/types/trade";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

interface Props {
  symbol: string;
  limit?: number;
}

export default function RecentTradesList({ symbol, limit = 30 }: Props) {
  const { data, loading, error } = useRecentTrades(symbol, limit);

  if (loading && data.length === 0) {
    return (
      <Card padding="sm">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="table-row" className="h-6" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="sm">
        <p className="text-xs text-sell">{error}</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-3 py-2 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs">📜</span>
          <h3 className="text-xs font-semibold text-txt-primary">Recent Trades</h3>
        </div>
        <Badge variant="live" size="sm">Live</Badge>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[70px_1fr_1fr] gap-2 px-3 py-1.5 border-b border-border-default">
        <span className="text-[8px] text-txt-faint uppercase tracking-wider">Time</span>
        <span className="text-[8px] text-txt-faint uppercase tracking-wider text-right">Price</span>
        <span className="text-[8px] text-txt-faint uppercase tracking-wider text-right">Qty</span>
      </div>

      {/* Trades */}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-border-default">
        {data.length === 0 ? (
          <div className="p-3 text-center text-xs text-txt-muted">No recent trades</div>
        ) : (
          data.map((trade, i) => (
            <TradeRow key={`${trade.t}-${i}`} trade={trade} />
          ))
        )}
      </div>
    </Card>
  );
}

function TradeRow({ trade }: { trade: SoDEXTrade }) {
  const isBuy = trade.S === "BUY";
  const time = new Date(trade.T);
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="grid grid-cols-[70px_1fr_1fr] gap-2 px-3 py-1.5 hover:bg-elevated/20 transition-colors items-center">
      <span className="text-[10px] font-mono text-txt-faint">{timeStr}</span>
      <span className={`text-[10px] font-mono text-right ${isBuy ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
        ${parseFloat(trade.p).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span className="text-[10px] font-mono text-txt-secondary text-right">
        {parseFloat(trade.q).toFixed(5)}
      </span>
    </div>
  );
}
