"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, PlusIcon, TrashIcon, CloseIcon } from "@/components/ui/icons";
import type { Alert, PriceAlert, SignalAlert } from "@/lib/types/alert";

interface Props {
  alerts: Alert[];
  activeAlerts: Alert[];
  triggeredAlerts: Alert[];
  permission: NotificationPermission | "default";
  onRequestPermission: () => void;
  onAddPriceAlert: (pair: string, type: "price_above" | "price_below", targetPrice: number) => void;
  onAddSignalAlert: (pair: string, type: "signal_strong" | "signal_reversal", condition: string) => void;
  onRemove: (id: string) => void;
  onClearTriggered: () => void;
  onClearAll: () => void;
}

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

export default function AlertPanel({
  alerts,
  activeAlerts,
  triggeredAlerts,
  permission,
  onRequestPermission,
  onAddPriceAlert,
  onAddSignalAlert,
  onRemove,
  onClearTriggered,
  onClearAll,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formPair, setFormPair] = useState(PAIRS[0]);
  const [formType, setFormType] = useState<"price_above" | "price_below" | "signal_strong" | "signal_reversal">("price_above");
  const [formPrice, setFormPrice] = useState("");
  const [formCondition, setFormCondition] = useState("STRONG_LONG");

  const handleSubmit = () => {
    if (formType === "price_above" || formType === "price_below") {
      const price = parseFloat(formPrice);
      if (isNaN(price) || price <= 0) return;
      onAddPriceAlert(formPair, formType, price);
    } else {
      onAddSignalAlert(formPair, formType, formCondition);
    }
    setShowForm(false);
    setFormPrice("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <BellIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-txt-primary">Alerts</h2>
            <p className="text-xs text-txt-muted">
              {activeAlerts.length} active · {triggeredAlerts.length} triggered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {triggeredAlerts.length > 0 && (
            <button
              onClick={onClearTriggered}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-txt-muted hover:bg-elevated hover:text-txt-primary transition-colors"
            >
              Clear triggered
            </button>
          )}
          {alerts.length > 0 && (
            <button
              onClick={onClearAll}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-error/70 hover:bg-error/10 hover:text-error transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
          >
            <PlusIcon size={14} />
            New Alert
          </button>
        </div>
      </div>

      {/* Permission banner */}
      {permission !== "granted" && (
        <div className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <BellIcon size={16} className="text-warning" />
            <span className="text-xs text-warning">
              {permission === "denied"
                ? "Browser notifications are blocked. Enable them in your browser settings."
                : "Enable browser notifications to get alerts even when the tab is in the background."}
            </span>
          </div>
          {permission === "default" && (
            <button
              onClick={onRequestPermission}
              className="cursor-pointer rounded-lg bg-warning/15 px-3 py-1 text-xs font-semibold text-warning hover:bg-warning/25 transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border-default bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-txt-primary">Create Alert</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="cursor-pointer text-txt-muted hover:text-txt-primary transition-colors"
                >
                  <CloseIcon size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pair selector */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Pair</label>
                  <select
                    value={formPair}
                    onChange={(e) => setFormPair(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary focus:border-accent/50 focus:outline-none"
                  >
                    {PAIRS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Alert type */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as typeof formType)}
                    className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary focus:border-accent/50 focus:outline-none"
                  >
                    <option value="price_above">Price Above</option>
                    <option value="price_below">Price Below</option>
                    <option value="signal_strong">Strong Signal</option>
                    <option value="signal_reversal">Signal Reversal</option>
                  </select>
                </div>
              </div>

              {/* Price input (for price alerts) */}
              {(formType === "price_above" || formType === "price_below") && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
                    Target Price (USDT)
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 68000"
                    className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary placeholder:text-txt-faint focus:border-accent/50 focus:outline-none"
                  />
                </div>
              )}

              {/* Condition (for signal alerts) */}
              {(formType === "signal_strong" || formType === "signal_reversal") && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">Condition</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border-default bg-elevated px-3 py-2 text-xs text-txt-primary focus:border-accent/50 focus:outline-none"
                  >
                    {formType === "signal_strong" ? (
                      <>
                        <option value="STRONG_LONG">Strong Long</option>
                        <option value="STRONG_SHORT">Strong Short</option>
                      </>
                    ) : (
                      <option value="any_reversal">Any Reversal</option>
                    )}
                  </select>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full cursor-pointer rounded-lg bg-accent/15 py-2 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
              >
                Create Alert
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-card py-16">
          <BellIcon size={32} className="text-txt-faint mb-3" />
          <p className="text-sm font-medium text-txt-muted">No alerts yet</p>
          <p className="text-xs text-txt-faint mt-1">Create a price or signal alert to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
                Active ({activeAlerts.length})
              </h3>
              <div className="space-y-1.5">
                {activeAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    formatTime={formatTime}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <div>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
                Triggered ({triggeredAlerts.length})
              </h3>
              <div className="space-y-1.5">
                {triggeredAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    formatTime={formatTime}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  formatTime,
  onRemove,
}: {
  alert: Alert;
  formatTime: (ts: number) => string;
  onRemove: (id: string) => void;
}) {
  const isPrice = alert.type === "price_above" || alert.type === "price_below";
  const priceAlert = isPrice ? (alert as PriceAlert) : null;
  const signalAlert = !isPrice ? (alert as SignalAlert) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        alert.triggered
          ? "border-warning/20 bg-warning/5"
          : "border-border-default bg-card"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            alert.triggered ? "bg-warning/15 text-warning" : "bg-accent/10 text-accent"
          }`}
        >
          <BellIcon size={14} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-txt-primary">{alert.pair}</span>
            {alert.triggered && (
              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning">
                TRIGGERED
              </span>
            )}
          </div>
          <p className="text-[11px] text-txt-muted mt-0.5 truncate">
            {priceAlert
              ? `${priceAlert.type === "price_above" ? "↑ Above" : "↓ Below"} $${priceAlert.targetPrice.toLocaleString()}`
              : signalAlert
                ? `${signalAlert.type === "signal_strong" ? "Strong" : "Reversal"}: ${signalAlert.condition}`
                : ""}
            {" · "}
            {formatTime(alert.triggeredAt ?? alert.createdAt)}
          </p>
        </div>
      </div>
      <button
        onClick={() => onRemove(alert.id)}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-txt-faint hover:bg-error/10 hover:text-error transition-colors"
        title="Delete alert"
      >
        <TrashIcon size={14} />
      </button>
    </motion.div>
  );
}
