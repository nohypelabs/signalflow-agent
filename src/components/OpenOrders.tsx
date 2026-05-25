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
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wide">
          Open Orders ({orders.length})
        </h3>
        {loading && (
          <span className="text-[10px] text-warning animate-pulse">Refreshing...</span>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 text-xs text-error">{error}</div>
      )}

      {loading && !error && (
        <div className="p-4 space-y-3">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <EmptyState title="No open orders on SoDEX" description="Place an order from the Trading page" />
      )}

      {!loading && orders.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-default text-txt-muted">
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
              <tr key={o.id} className="border-b border-border-default hover:bg-elevated">
                <td className="p-3 text-txt-primary font-semibold">{o.symbol}</td>
                <td className="p-3">
                  <Badge variant={o.side === "BUY" ? "buy" : "sell"} size="sm">{o.side}</Badge>
                </td>
                <td className="p-3 text-right text-txt-secondary">{o.quantity}</td>
                <td className="p-3 text-right text-txt-secondary font-mono">{o.price}</td>
                <td className="p-3 text-center">
                  <Badge variant={statusVariant(o.status)} size="sm">{o.status}</Badge>
                </td>
                <td className="p-3 text-right">
                  {o.status === "NEW" && (
                    <Button variant="danger" size="sm" onClick={() => handleCancel(o.id)} disabled={cancelling === o.id}>
                      {cancelling === o.id ? "..." : "Cancel"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
