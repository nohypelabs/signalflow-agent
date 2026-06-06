"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import type { Alert, PriceAlert, SignalAlert } from "@/lib/types/alert";
import type { SoDEXTicker } from "@/lib/sodex-types";

const STORAGE_KEY = "signalflow_alerts";
const MAX_ALERTS = 50;

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_ALERTS);
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(alerts: Alert[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // storage full or blocked
  }
}

function requestBrowserPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

function fireNotification(title: string, body: string) {
  try {
    if (typeof window !== "undefined" && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag: "signalflow-alert",
      });
    }
  } catch {
    // notification blocked
  }
}

export function useAlerts(tickers?: SoDEXTicker[] | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const lastTriggeredRef = useRef<Set<string>>(new Set());

  // Add manual signal generated notification (called from generate signal flow)
  const addManualSignalGenerated = useCallback((pair: string, action: string, confidence: number, strategy?: string) => {
    const newAlert: any = {
      id: generateId(),
      pair,
      type: 'manual_signal_generated',
      action,
      confidence,
      strategy,
      createdAt: Date.now(),
      triggered: true,
    };
    setAlerts(prev => {
      const next = [newAlert, ...prev.filter((a: any) => a.id !== newAlert.id)].slice(0, MAX_ALERTS);
      return next;
    });
    fireNotification(`Manual Signal: ${action} ${pair}`, `Conf ${confidence}%${strategy ? ` • ${strategy}` : ''}`);
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setAlerts(loadFromStorage());
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    setHydrated(true);
  }, []);

  // Persist whenever alerts change (skip initial)
  useEffect(() => {
    if (hydrated) saveToStorage(alerts);
  }, [alerts, hydrated]);

  // Listen for cross-component manual signal alerts (so bell updates immediately)
  useEffect(() => {
    const handler = () => {
      const fresh = loadFromStorage();
      setAlerts(fresh);
    };
    window.addEventListener('manual-signal-alert-added', handler);
    return () => window.removeEventListener('manual-signal-alert-added', handler);
  }, []);

  // Build ticker map from array
  const tickerMap = useMemo(() => {
    if (!tickers) return undefined;
    const map = new Map<string, SoDEXTicker>();
    for (const t of tickers) {
      map.set(t.symbol, t);
    }
    return map;
  }, [tickers]);

  // Check price alerts against live tickers
  useEffect(() => {
    if (!tickerMap || alerts.length === 0) return;

    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((alert) => {
        if (alert.triggered || alert.type === "signal_strong" || alert.type === "signal_reversal") {
          return alert;
        }

        const priceAlert = alert as PriceAlert;
        const symbol = `v${priceAlert.pair.replace("/USDT", "").replace("/USDC", "")}_vUSDC`;
        const ticker = tickerMap.get(symbol);
        if (!ticker) return alert;

        const currentPrice = parseFloat(ticker.lastPx);
        if (isNaN(currentPrice)) return alert;

        const shouldTrigger =
          (priceAlert.type === "price_above" && currentPrice >= priceAlert.targetPrice) ||
          (priceAlert.type === "price_below" && currentPrice <= priceAlert.targetPrice);

        if (shouldTrigger && !lastTriggeredRef.current.has(alert.id)) {
          lastTriggeredRef.current.add(alert.id);

          const direction = priceAlert.type === "price_above" ? "above" : "below";
          const msg = `${priceAlert.pair} is now ${direction} $${priceAlert.targetPrice.toLocaleString()} (current: $${currentPrice.toLocaleString()})`;

          toast.success("Price Alert Triggered", { description: msg });
          fireNotification("Price Alert Triggered", msg);

          changed = true;
          return {
            ...priceAlert,
            currentPrice,
            triggered: true,
            triggeredAt: Date.now(),
          };
        }

        // Update current price even if not triggered
        if (priceAlert.currentPrice !== currentPrice) {
          changed = true;
          return { ...priceAlert, currentPrice };
        }

        return alert;
      });

      return changed ? next : prev;
    });
  }, [tickerMap, alerts.length]);

  const requestPermission = useCallback(async () => {
    const result = await requestBrowserPermission();
    setPermission(result);
    return result;
  }, []);

  const addPriceAlert = useCallback(
    (pair: string, type: "price_above" | "price_below", targetPrice: number) => {
      const symbol = `v${pair.replace("/USDT", "").replace("/USDC", "")}_vUSDC`;
      const ticker = tickerMap?.get(symbol);
      const currentPrice = ticker ? parseFloat(ticker.lastPx) : 0;

      const alert: PriceAlert = {
        id: generateId(),
        pair,
        type,
        targetPrice,
        currentPrice: isNaN(currentPrice) ? 0 : currentPrice,
        triggered: false,
        createdAt: Date.now(),
      };

      setAlerts((prev) => [alert, ...prev]);

      // Request notification permission on first alert
      if (permission === "default") {
        requestPermission();
      }

      toast.success("Alert Created", {
        description: `${pair} ${type === "price_above" ? "↑" : "↓"} $${targetPrice.toLocaleString()}`,
      });

      return alert;
    },
    [tickerMap, permission, requestPermission],
  );

  const addSignalAlert = useCallback(
    (pair: string, type: "signal_strong" | "signal_reversal", condition: string) => {
      const alert: SignalAlert = {
        id: generateId(),
        pair,
        type,
        condition,
        triggered: false,
        createdAt: Date.now(),
      };

      setAlerts((prev) => [alert, ...prev]);

      if (permission === "default") {
        requestPermission();
      }

      toast.success("Signal Alert Created", {
        description: `${pair} — ${type === "signal_strong" ? "Strong signal" : "Reversal"}: ${condition}`,
      });

      return alert;
    },
    [permission, requestPermission],
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    lastTriggeredRef.current.delete(id);
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => {
      const ids = prev.filter((a) => a.triggered).map((a) => a.id);
      ids.forEach((id) => lastTriggeredRef.current.delete(id));
      return prev.filter((a) => !a.triggered);
    });
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
    lastTriggeredRef.current.clear();
  }, []);

  const triggerSignalAlert = useCallback((pair: string, signalAction: string) => {
    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((alert) => {
        if (alert.triggered) return alert;
        if (alert.type !== "signal_strong" && alert.type !== "signal_reversal") return alert;

        const signalAlert = alert as SignalAlert;
        if (signalAlert.pair !== pair) return alert;

        const shouldTrigger =
          (signalAlert.type === "signal_strong" &&
            (signalAction === "STRONG_LONG" || signalAction === "STRONG_SHORT")) ||
          (signalAlert.type === "signal_reversal" &&
            signalAlert.condition === "any_reversal" &&
            (signalAction.includes("LONG") || signalAction.includes("SHORT")));

        if (shouldTrigger && !lastTriggeredRef.current.has(alert.id)) {
          lastTriggeredRef.current.add(alert.id);
          const msg = `${pair} — ${signalAction} signal detected!`;

          toast.success("Signal Alert Triggered", { description: msg });
          fireNotification("Signal Alert Triggered", msg);

          changed = true;
          return { ...signalAlert, triggered: true, triggeredAt: Date.now() };
        }

        return alert;
      });

      return changed ? next : prev;
    });
  }, []);

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const unreadCount = triggeredAlerts.filter((a) => {
    const oneHourAgo = Date.now() - 3600_000;
    return (a.triggeredAt ?? 0) > oneHourAgo;
  }).length;

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    unreadCount,
    permission,
    hydrated,
    addPriceAlert,
    addSignalAlert,
    addManualSignalGenerated,
    removeAlert,
    clearTriggered,
    clearAll,
    requestPermission,
    triggerSignalAlert,
  };
}
