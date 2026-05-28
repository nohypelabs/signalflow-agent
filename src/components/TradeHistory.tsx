"use client";

import { useState } from "react";
import type { Signal } from "@/lib/types/signal";
import type { SoDEXTicker, SoDEXOrder } from "@/lib/sodex-types";
import type { PaperStats, PaperTrade } from "@/lib/hooks/usePaperTrading";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface Props {
  orders: SoDEXOrder[];
  ordersLoading: boolean;
  ordersError: string | null;
  tickers?: SoDEXTicker[] | null;
  liveSignals?: Signal[];
  paperTrades?: PaperTrade[];
  paperStats?: PaperStats;
  onExecuteSignal: (signal: Signal) => void;
  onCancelOrder: (orderId: number) => Promise<void>;
}

type Tab = "paper" | "open" | "filled" | "signals";

function statusVariant(status: string): string {
  switch (status) {
    case "NEW": return "info";
    case "FILLED": return "live";
    case "PARTIALLY_FILLED": return "warning";
    case "CANCELLED": return "error";
    case "REJECTED": return "error";
    default: return "muted";
  }
}

export default function TradeHistory({
  orders,
  ordersLoading,
  ordersError,
  tickers,
  liveSignals = [],
  paperTrades = [],
  paperStats,
  onExecuteSignal,
  onCancelOrder,
}: Props) {
  const [tab, setTab] = useState<Tab>("paper");
  const [cancelling, setCancelling] = useState<number | null>(null);

  const tickerMap = new Map<string, SoDEXTicker>();
  if (tickers) tickers.forEach((t) => tickerMap.set(t.symbol, t));

  const openOrders = orders.filter((o) => o.status === "NEW" || o.status === "PARTIALLY_FILLED");
  const filledOrders = orders.filter((o) => o.status === "FILLED");
  const historyOrders = orders.filter((o) => o.status !== "NEW" && o.status !== "PARTIALLY_FILLED");
  const closedPaperTrades = paperTrades
    .filter((trade) => trade.status !== "OPEN")
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
  const paperPnl = closedPaperTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

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
      <PageHeader title="Trade History" badge={{ variant: "accent", label: "PAPER + LIVE" }} />

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card padding="sm" accent="var(--accent-primary)">
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Paper Closed</p>
          <p className="text-xl font-bold font-mono text-accent">{closedPaperTrades.length}</p>
        </Card>
        <Card padding="sm" accent={paperPnl >= 0 ? "var(--color-buy)" : "var(--color-sell)"}>
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Paper P&L</p>
          <p className={`text-xl font-bold font-mono ${paperPnl >= 0 ? "text-buy" : "text-sell"}`}>
            {paperPnl >= 0 ? "+" : ""}{fmtUsd(paperPnl)}
          </p>
        </Card>
        <Card padding="sm" accent="var(--color-info)">
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Open Orders</p>
          <p className="text-xl font-bold font-mono text-info">{openOrders.length}</p>
        </Card>
        <Card padding="sm" accent="var(--color-buy)">
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Filled</p>
          <p className="text-xl font-bold font-mono text-buy">{filledOrders.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Total Orders</p>
          <p className="text-xl font-bold font-mono text-txt-primary">{orders.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] text-txt-muted uppercase tracking-wider">Signals</p>
          <p className="text-xl font-bold font-mono text-accent">{liveSignals.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-inset rounded-lg p-1 w-fit">
        {(["paper", "open", "filled", "signals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${
              tab === t
                ? "bg-accent text-white"
                : "text-txt-muted hover:text-txt-secondary"
            }`}
          >
            {t === "paper"
              ? `Paper (${closedPaperTrades.length})`
              : t === "open"
                ? `Open (${openOrders.length})`
                : t === "filled"
                  ? `Live History (${historyOrders.length})`
                  : `Signals (${liveSignals.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card padding="none" className="overflow-hidden">
        {/* Loading */}
        {ordersLoading && (
          <div className="p-4 space-y-3">
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
            <Skeleton variant="table-row" />
          </div>
        )}

        {/* Error */}
        {ordersError && !ordersLoading && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-error">{ordersError}</p>
            <p className="text-xs text-txt-muted mt-1">Connect wallet and ensure SoDEX is reachable</p>
          </div>
        )}

        {/* Paper Trade History */}
        {tab === "paper" && (
          <>
            {closedPaperTrades.length === 0 ? (
              <EmptyState title="No closed paper trades yet" description="Closed TP, SL, liquidation, and manual exits will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border-default text-txt-muted text-xs">
                      <th className="text-left p-3 font-medium">Pair</th>
                      <th className="text-left p-3 font-medium">Side</th>
                      <th className="text-right p-3 font-medium">Leverage</th>
                      <th className="text-right p-3 font-medium">Margin</th>
                      <th className="text-right p-3 font-medium">Entry</th>
                      <th className="text-right p-3 font-medium">Exit</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">PnL</th>
                      <th className="text-right p-3 font-medium">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPaperTrades.map((trade) => (
                      <PaperTradeHistoryRow key={trade.id} trade={trade} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {paperStats && closedPaperTrades.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border-default p-4">
                <HistoryMetric label="Win Rate" value={`${paperStats.winRate.toFixed(1)}%`} tone={paperStats.winRate >= 50 ? "buy" : "sell"} />
                <HistoryMetric label="Profit Factor" value={paperStats.profitFactor === Infinity ? "∞" : paperStats.profitFactor.toFixed(2)} tone={paperStats.profitFactor >= 1 ? "buy" : "sell"} />
                <HistoryMetric label="Best Trade" value={`+${fmtUsd(paperStats.bestTrade)}`} tone="buy" />
                <HistoryMetric label="Worst Trade" value={fmtUsd(paperStats.worstTrade)} tone="sell" />
              </div>
            )}
          </>
        )}

        {/* Open Orders */}
        {!ordersLoading && !ordersError && tab === "open" && (
          <>
            {openOrders.length === 0 ? (
              <EmptyState title="No open orders" description="Execute a signal from the Trading page to place an order" />
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-border-default text-txt-muted text-xs">
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
                    <tr key={o.id} className="border-b border-border-default hover:bg-elevated">
                      <td className="p-3 font-semibold text-txt-primary">{o.symbol}</td>
                      <td className="p-3">
                        <Badge variant={o.side === "BUY" ? "buy" : "sell"} size="sm">{o.side}</Badge>
                      </td>
                      <td className="p-3 text-right text-txt-secondary">{o.quantity}</td>
                      <td className="p-3 text-right text-txt-secondary font-mono">{o.price || "MARKET"}</td>
                      <td className="p-3 text-right text-txt-secondary">{o.executedQty || "0"}</td>
                      <td className="p-3 text-center">
                        <Badge variant={statusVariant(o.status)} size="sm">{o.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="danger" size="sm" onClick={() => handleCancel(o.id)} disabled={cancelling === o.id}>
                          {cancelling === o.id ? "..." : "Cancel"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </>
        )}

        {/* Order History */}
        {!ordersLoading && !ordersError && tab === "filled" && (
          <>
            {historyOrders.length === 0 ? (
              <EmptyState title="No order history yet" description="Filled and cancelled orders will appear here" />
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-border-default text-txt-muted text-xs">
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
                    <tr key={o.id} className="border-b border-border-default hover:bg-elevated">
                      <td className="p-3 font-semibold text-txt-primary">{o.symbol}</td>
                      <td className="p-3">
                        <Badge variant={o.side === "BUY" ? "buy" : "sell"} size="sm">{o.side}</Badge>
                      </td>
                      <td className="p-3 text-right text-txt-secondary">{o.quantity}</td>
                      <td className="p-3 text-right text-txt-secondary font-mono">{o.price || "MARKET"}</td>
                      <td className="p-3 text-right text-txt-secondary">{o.executedQty || o.quantity}</td>
                      <td className="p-3 text-center">
                        <Badge variant={statusVariant(o.status)} size="sm">{o.status}</Badge>
                      </td>
                      <td className="p-3 text-right text-txt-muted text-xs">
                        {new Date(o.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </>
        )}

        {/* Signals */}
        {tab === "signals" && liveSignals.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-txt-muted">No signals yet</p>
          </div>
        )}
        {tab === "signals" && liveSignals.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="border-b border-border-default text-txt-muted text-xs">
                <th className="text-left p-3 font-medium">Pair</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-right p-3 font-medium">Confidence</th>
                <th className="text-right p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {liveSignals.map((s, i) => (
                <tr key={i} className="border-b border-border-default hover:bg-elevated">
                  <td className="p-3 font-semibold text-txt-primary">{s.pair}</td>
                  <td className="p-3">
                    <Badge variant={s.action.toLowerCase()} size="sm">{s.action}</Badge>
                  </td>
                  <td className="p-3 text-right text-txt-secondary font-mono">
                    ${s.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant={s.confidence >= 80 ? "live" : "warning"} size="sm">{s.confidence}%</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => onExecuteSignal(s)}>
                      Execute
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <p className="text-[10px] text-txt-faint text-right">
        SoDEX — real orders on ValueChain
      </p>
    </div>
  );
}

function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : abs.toFixed(2);
  return `${value < 0 ? "-" : ""}$${formatted}`;
}

function fmtPrice(value: number): string {
  if (value >= 10000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(5);
}

function paperStatusLabel(status: PaperTrade["status"]): string {
  return status.replace("CLOSED_", "");
}

function paperStatusClass(status: PaperTrade["status"]): string {
  if (status === "CLOSED_TP") return "bg-buy/15 text-buy";
  if (status === "CLOSED_SL" || status === "CLOSED_LIQ") return "bg-sell/15 text-sell";
  return "bg-elevated text-txt-secondary";
}

function PaperTradeHistoryRow({ trade }: { trade: PaperTrade }) {
  const pnl = trade.pnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <tr className="border-b border-border-default hover:bg-elevated">
      <td className="p-3 font-semibold text-txt-primary">{trade.pair}</td>
      <td className="p-3">
        <Badge variant={trade.side === "LONG" ? "buy" : "sell"} size="sm">{trade.side}</Badge>
      </td>
      <td className="p-3 text-right text-accent font-mono">{trade.leverage}x</td>
      <td className="p-3 text-right text-txt-secondary font-mono">{fmtUsd(trade.margin)}</td>
      <td className="p-3 text-right text-txt-secondary font-mono">${fmtPrice(trade.entryPrice)}</td>
      <td className="p-3 text-right text-txt-secondary font-mono">
        {trade.exitPrice ? `$${fmtPrice(trade.exitPrice)}` : "-"}
      </td>
      <td className="p-3 text-center">
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${paperStatusClass(trade.status)}`}>
          {paperStatusLabel(trade.status)}
        </span>
      </td>
      <td className={`p-3 text-right font-bold font-mono ${isProfit ? "text-buy" : "text-sell"}`}>
        {isProfit ? "+" : ""}{fmtUsd(pnl)}
        <span className="ml-1 text-[10px] opacity-80">
          ({(trade.pnlPercent ?? 0) >= 0 ? "+" : ""}{(trade.pnlPercent ?? 0).toFixed(2)}%)
        </span>
      </td>
      <td className="p-3 text-right text-txt-muted text-xs">
        {trade.closedAt ? new Date(trade.closedAt).toLocaleString() : "-"}
      </td>
    </tr>
  );
}

function HistoryMetric({ label, value, tone }: { label: string; value: string; tone: "buy" | "sell" }) {
  return (
    <div className="rounded-lg border border-border-default bg-inset/40 p-3">
      <p className="text-[9px] uppercase tracking-wider text-txt-faint">{label}</p>
      <p className={`mt-1 text-sm font-bold font-mono ${tone === "buy" ? "text-buy" : "text-sell"}`}>{value}</p>
    </div>
  );
}
