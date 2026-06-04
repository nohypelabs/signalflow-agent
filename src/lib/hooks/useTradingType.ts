"use client";

import { useCallback, useEffect, useState } from "react";
import type { TradingType } from "../types/trading-type";
import {
  clearTradingType,
  loadTradingType,
  saveTradingType,
  TRADING_TYPE_EVENT,
  TRADING_TYPE_STORAGE_KEY,
} from "../types/trading-type";

export function useTradingType() {
  const [tradingType, setTradingTypeState] = useState<TradingType | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const syncTradingType = () => {
      setTradingTypeState(loadTradingType());
      setHydrated(true);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === TRADING_TYPE_STORAGE_KEY) syncTradingType();
    };

    syncTradingType();
    window.addEventListener(TRADING_TYPE_EVENT, syncTradingType);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(TRADING_TYPE_EVENT, syncTradingType);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const setTradingType = useCallback((type: TradingType | null) => {
    if (type) {
      saveTradingType(type);
    } else {
      clearTradingType();
    }
    setTradingTypeState(type);
  }, []);

  return { tradingType, hydrated, setTradingType };
}
