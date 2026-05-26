"use client";

import { useDashboard } from "@/lib/dashboard-context";
import OpenOrders from "@/components/OpenOrders";
import { pairToSodexSymbol } from "@/lib/pair-map";

export default function TradingPage() {
  const d = useDashboard();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-txt-primary">Trading</h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-buy-muted text-buy border border-buy-dim rounded">
          LIVE
        </span>
        {!d.isConnected && (
          <span className="text-[10px] text-hold">
            &mdash; Connect wallet to trade
          </span>
        )}
        {d.isConnected && (
          <span className="text-[10px] text-txt-muted">
            &mdash; {d.address?.slice(0, 6)}...{d.address?.slice(-4)}
          </span>
        )}
      </div>

      {/* Signals to execute */}
      <div className="bg-card border border-border-default rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 text-txt-primary">
          Execute Signals
        </h3>
        {!d.isConnected && (
          <p className="text-xs text-hold mb-3">
            Connect wallet to execute trades on SoDEX
          </p>
        )}
        <div className="flex flex-col gap-2">
          {d.liveSignals.length === 0 && (
            <p className="text-xs text-txt-muted text-center py-4">Loading signals...</p>
          )}
          {d.liveSignals.map((s, i) => {
            const sodSym = pairToSodexSymbol(s.pair);
            const live = d.tickerMap.get(sodSym);
            const livePrice = live ? parseFloat(live.lastPx) : s.price;
            const hasOpenOrder = d.openOrders.some(
              (o) => o.symbol === sodSym,
            );
            return (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-border-default hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-txt-primary">
                    {s.pair}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      s.action === "BUY"
                        ? "text-buy"
                        : s.action === "SELL"
                          ? "text-sell"
                          : "text-hold"
                    }`}
                  >
                    {s.action}
                  </span>
                  <span className="text-[11px] text-txt-muted font-mono">
                    ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      s.confidence >= 80
                        ? "bg-buy-muted text-buy"
                        : "bg-hold-muted text-hold"
                    }`}
                  >
                    {s.confidence}%
                  </span>
                </div>
                <button
                  onClick={() => d.handleExecuteSignal(s)}
                  disabled={!d.isConnected || hasOpenOrder}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    !d.isConnected || hasOpenOrder
                      ? "bg-inset text-txt-dim cursor-not-allowed"
                      : "bg-accent text-white hover:bg-[#6a1fee]"
                  }`}
                >
                  {!d.isConnected
                    ? "Connect Wallet"
                    : hasOpenOrder
                      ? "Order Open"
                      : "Execute"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open orders */}
      <OpenOrders
        orders={d.orders}
        loading={d.ordersLoading}
        error={d.ordersError}
        onCancel={d.cancelOrder}
      />
    </div>
  );
}
