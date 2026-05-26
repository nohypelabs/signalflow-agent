"use client";

import type { SoDEXOrder } from "@/lib/sodex-types";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  orders: SoDEXOrder[];
  loading: boolean;
  error: string | null;
  onCancel: (orderId: number) => Promise<void>;
}

function statusConfig(status: string): { variant: string; label: string } {
  switch (status) {
    case "NEW": return { variant: "info", label: "Open" };
    case "FILLED": return { variant: "live", label: "Filled" };
    case "PARTIALLY_FILLED": return { variant: "warning", label: "Partial" };
    case "CANCELLED": return { variant: "error", label: "Cancelled" };
    case "REJECTED": return { variant: "error", label: "Rejected" };
    default: return { variant: "muted", label: status };
  }
}

export default function OpenOrders({ orders, loading, error, onCancel }: Props) {
  const [cancelling, setCancelling] = useState<number | null>(null);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await onCancel(id);
    } catch {
      // handled by parent
    } finally {
      setCancelling(null);
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">
            Open Orders
          </h3>
          {orders.length > 0 && (
            <Badge variant="info" size="sm">{orders.length}</Badge>
          )}
        </div>
        {loading && (
          <span className="text-[10px] text-warning animate-pulse">Refreshing...</span>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 border-b border-sell-dim bg-sell-muted/20">
          <p className="text-xs text-error">{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="p-4 space-y-3">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <EmptyState
          title="No open orders"
          description="Place a trade from the Trading page to see orders here"
          icon="orders"
        />
      )}

      {!loading && orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-3 font-medium text-txt-dim">Symbol</th>
                <th className="text-left p-3 font-medium text-txt-dim">Side</th>
                <th className="text-right p-3 font-medium text-txt-dim">Qty</th>
                <th className="text-right p-3 font-medium text-txt-dim">Price</th>
                <th className="text-center p-3 font-medium text-txt-dim">Status</th>
                <th className="text-right p-3 font-medium text-txt-dim w-20" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const sc = statusConfig(o.status);
                return (
                  <tr key={o.id} className="border-b border-border-default hover:bg-elevated/30 transition-colors">
                    <td className="p-3 text-txt-primary font-semibold font-mono">
                      {o.symbol.replace(/^v/, "").replace(/_vUSDC$/, "/USDC")}
                    </td>
                    <td className="p-3">
                      <Badge variant={o.side === "BUY" ? "buy" : "sell"} size="sm">{o.side}</Badge>
                    </td>
                    <td className="p-3 text-right text-txt-secondary font-mono">{o.quantity}</td>
                    <td className="p-3 text-right text-txt-secondary font-mono">
                      ${parseFloat(o.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      {o.status === "NEW" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancel(o.id)}
                          disabled={cancelling === o.id}
                          loading={cancelling === o.id}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
