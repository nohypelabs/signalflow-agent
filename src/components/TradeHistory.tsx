"use client";

import { useState } from "react";
import { signals, type Signal } from "@/lib/mock-data";
import type { SoDEXTicker, SoDEXOrder } from "@/lib/sodex-types";
import { pairToSodexSymbol } from "@/lib/pair-map";

interface Props {
  orders: SoDEXOrder[];
  ordersLoading: boolean;
  ordersError: string | null;
  tickers?: SoDEXTicker[] | null;
  onExecuteSignal: (signal: Signal) => void;
  onCancelOrder: (orderId: number) => Promise<void>;
}

type Tab = "open" | "filled" | "signals";

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

export default function TradeHistory({
  orders,
  ordersLoading,
  ordersError,
  tickers,
  onExecuteSignal,
  onCancelOrder,
}: Props) {
  const [tab, setTab] = useState<Tab>("open");
  const [cancelling, setCancelling] = useState<number | null>(null);

  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const openOrders = orders.filter((o) => o.status === "NEW" || o.status === "PARTIALLY_FILLED");
  const filledOrders = orders.filter((o) => o.status === "FILLED");
  const historyOrders = orders.filter((o) => o.status !== "NEW" && o.status !== "PARTIALLY_FILLED");

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await onCancelOrder(id);
    } catch {
      // silently fail
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Trade History</h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-[#00ff8815] text-[#00ff88] border border-[#00ff8830] rounded">
          LIVE
        </span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-3">
          <p className="text-[10px] text-[#666677]">Open Orders</p>
          <p className="text-lg font-bold text-[#00d4ff]">{openOrders.length}</p>
        </div>
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-3">
          <p className="text-[10px] text-[#666677]">Filled</p>
          <p className="text-lg font-bold text-[#00ff88]">{filledOrders.length}</p>
        </div>
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-3">
          <p className="text-[10px] text-[#666677]">Total Orders</p>
          <p className="text-lg font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl p-3">
          <p className="text-[10px] text-[#666677]">Signals</p>
          <p className="text-lg font-bold text-[#7b2fff]">{signals.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d1a] rounded-lg p-1 w-fit">
        {(["open", "filled", "signals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === t
                ? "bg-[#7b2fff] text-white font-semibold"
                : "text-[#666677] hover:text-white"
            }`}
          >
            {t === "open" ? `Open (${openOrders.length})` : t === "filled" ? `History (${historyOrders.length})` : `Signals (${signals.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#12122a] border border-[#1a1a2e] rounded-xl overflow-hidden">
        {/* Loading */}
        {ordersLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#ff8800] animate-pulse">Loading orders...</p>
          </div>
        )}

        {/* Error */}
        {ordersError && !ordersLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#ff4444]">{ordersError}</p>
            <p className="text-[11px] text-[#666677] mt-1">Connect wallet and ensure SoDEX is reachable</p>
          </div>
        )}

        {/* Open Orders */}
        {!ordersLoading && !ordersError && tab === "open" && (
          <>
            {openOrders.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-[#666677]">No open orders</p>
                <p className="text-[11px] text-[#444455] mt-1">Execute a signal from the Trading page to place an order</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a2e] text-[#666677] text-xs">
                    <th className="text-left p-3 font-medium">Symbol</th>
                    <th className="text-left p-3 font-medium">Side</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-right p-3 font-medium">Price</th>
                    <th className="text-right p-3 font-medium">Filled</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((o) => (
                    <tr key={o.id} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40]">
                      <td className="p-3 font-semibold text-white">{o.symbol}</td>
                      <td className={`p-3 font-bold text-xs ${o.side === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                        {o.side}
                      </td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.quantity}</td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.price || "MARKET"}</td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.executedQty || "0"}</td>
                      <td className={`p-3 text-center font-semibold text-xs ${statusColor(o.status)}`}>
                        {o.status}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleCancel(o.id)}
                          disabled={cancelling === o.id}
                          className="px-2 py-1 text-[10px] rounded bg-[#ff444415] text-[#ff4444] border border-[#ff444430] hover:bg-[#ff444425] disabled:opacity-50"
                        >
                          {cancelling === o.id ? "..." : "Cancel"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Order History */}
        {!ordersLoading && !ordersError && tab === "filled" && (
          <>
            {historyOrders.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-[#666677]">No order history yet</p>
                <p className="text-[11px] text-[#444455] mt-1">Filled and cancelled orders will appear here</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a2e] text-[#666677] text-xs">
                    <th className="text-left p-3 font-medium">Symbol</th>
                    <th className="text-left p-3 font-medium">Side</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-right p-3 font-medium">Price</th>
                    <th className="text-right p-3 font-medium">Filled</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrders.map((o) => (
                    <tr key={o.id} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40]">
                      <td className="p-3 font-semibold text-white">{o.symbol}</td>
                      <td className={`p-3 font-bold text-xs ${o.side === "BUY" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                        {o.side}
                      </td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.quantity}</td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.price || "MARKET"}</td>
                      <td className="p-3 text-right text-[#aaaaaa]">{o.executedQty || o.quantity}</td>
                      <td className={`p-3 text-center font-semibold text-xs ${statusColor(o.status)}`}>
                        {o.status}
                      </td>
                      <td className="p-3 text-right text-[#666677] text-xs">
                        {new Date(o.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Signals */}
        {tab === "signals" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a2e] text-[#666677] text-xs">
                <th className="text-left p-3 font-medium">Pair</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-right p-3 font-medium">Confidence</th>
                <th className="text-right p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr key={i} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e40]">
                  <td className="p-3 font-semibold text-white">{s.pair}</td>
                  <td className="p-3">
                    <span className={`text-xs font-bold ${s.action === "BUY" ? "text-[#00ff88]" : s.action === "SELL" ? "text-[#ff4444]" : "text-[#ff8800]"}`}>
                      {s.action}
                    </span>
                  </td>
                  <td className="p-3 text-right text-[#aaaaaa]">
                    ${s.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      s.confidence >= 80 ? "bg-[#00ff8820] text-[#00ff88]" : "bg-[#ff880020] text-[#ff8800]"
                    }`}>
                      {s.confidence}%
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onExecuteSignal(s)}
                      className="px-2.5 py-1 text-[10px] rounded font-semibold bg-[#7b2fff20] text-[#7b2fff] border border-[#7b2fff30] hover:bg-[#7b2fff30] transition-colors"
                    >
                      Execute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[10px] text-[#333344] text-right">
        SoDEX — real orders on ValueChain
      </p>
    </div>
  );
}
