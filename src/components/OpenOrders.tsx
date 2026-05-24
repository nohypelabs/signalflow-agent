"use client";

import type { SoDEXOrder } from "@/lib/sodex-types";
import { useState } from "react";

interface Props {
  orders: SoDEXOrder[];
  loading: boolean;
  error: string | null;
  onCancel: (orderId: number) => Promise<void>;
}

function statusColor(status: string) {
  switch (status) {
    case "NEW": return "text-[#00d4ff]";
    case "FILLED": return "text-[#00ff88]";
    case "PARTIALLY_FILLED": return "text-[#ff8800]";
    case "CANCELLED": return "text-[#ff4444]";
    case "REJECTED": return "text-[#ff4444]";
    default: return "text-[#666677]";
  }
}

export default function OpenOrders({ orders, loading, error, onCancel }: Props) {
  const [cancelling, setCancelling] = useState<number | null>(null);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await onCancel(id);
    } catch {
      // error silently for now
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
        <h3 className="text-xs font-semibold text-[#666677] uppercase tracking-wide">
          Open Orders ({orders.length})
        </h3>
        {loading && <span className="text-[10px] text-[#ff8800] animate-pulse">Refreshing...</span>}
      </div>

      {error && (
        <div className="px-4 py-3 text-xs text-[#ff4444]">{error}</div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="px-4 py-8 text-center text-xs text-[#666677]">
          No open orders on SoDEX
        </div>
      )}

      {orders.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1a1a2e] text-[#666677]">
              <th className="text-left p-3 font-medium">Symbol</th>
              <th className="text-left p-3 font-medium">Side</th>
              <th className="text-right p-3 font-medium">Qty</th>
              <th className="text-right p-3 font-medium">Price</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40]">
                <td className="p-3 text-white font-semibold">{o.symbol}</td>
                <td className={`p-3 font-bold ${o.side === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {o.side}
                </td>
                <td className="p-3 text-right text-[#aaaaaa]">{o.quantity}</td>
                <td className="p-3 text-right text-[#aaaaaa]">{o.price}</td>
                <td className={`p-3 text-center font-semibold ${statusColor(o.status)}`}>
                  {o.status}
                </td>
                <td className="p-3 text-right">
                  {o.status === "NEW" && (
                    <button
                      onClick={() => handleCancel(o.id)}
                      disabled={cancelling === o.id}
                      className="px-2 py-1 text-[10px] rounded bg-[#ff444415] text-[#ff4444] border border-[#ff444430] hover:bg-[#ff444425] disabled:opacity-50"
                    >
                      {cancelling === o.id ? "..." : "Cancel"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
