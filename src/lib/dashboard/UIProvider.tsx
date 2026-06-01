"use client";

import { useCallback, useState } from "react";
import type { Signal } from "../types/signal";

export function useUIProviderState(
  refreshOrders: () => Promise<void>,
) {
  const [selectedPair, setSelectedPair] = useState("BTC/USDC");
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [executingSignal, setExecutingSignal] = useState<Signal | null>(null);

  const handleExecuteSignal = useCallback((signal: Signal) => {
    setExecutingSignal(signal);
    setShowTradeForm(true);
  }, []);

  const handleExecuteOrder = useCallback(
    async () => {
      await refreshOrders();
    },
    [refreshOrders],
  );

  const handleCloseForm = useCallback(() => {
    setShowTradeForm(false);
    setExecutingSignal(null);
  }, []);

  return {
    selectedPair,
    setSelectedPair,
    showTradeForm,
    executingSignal,
    handleExecuteSignal,
    handleExecuteOrder,
    handleCloseForm,
  };
}
