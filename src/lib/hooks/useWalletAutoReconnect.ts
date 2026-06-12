"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAccount, useReconnect } from "wagmi";

interface UseWalletAutoReconnectOptions {
  maxReconnectAttempts?: number;
  reconnectRetryDelayMs?: number;
  enabled?: boolean;
}

interface WalletReconnectState {
  isReconnecting: boolean;
  attemptCount: number;
  lastError: string | null;
}

export function useWalletAutoReconnect(options: UseWalletAutoReconnectOptions = {}) {
  const {
    maxReconnectAttempts = 3,
    reconnectRetryDelayMs = 2000,
    enabled = true,
  } = options;

  const { isConnected, isConnecting, isDisconnected } = useAccount();
  const { reconnect } = useReconnect();
  const [state, setState] = useState<WalletReconnectState>({
    isReconnecting: false,
    attemptCount: 0,
    lastError: null,
  });

  const attemptRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevConnectedRef = useRef(isConnected);
  const reconnectRef = useRef(reconnect);
  reconnectRef.current = reconnect;

  const clearRetryTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Use ref-based recursive call to avoid react-hooks lint issue
  const attemptReconnectRef = useRef<(() => Promise<void>) | null>(null);
  attemptReconnectRef.current = async () => {
    if (!enabled || attemptRef.current >= maxReconnectAttempts) {
      setState((s) => ({
        ...s,
        isReconnecting: false,
        lastError: attemptRef.current >= maxReconnectAttempts ? "Max reconnection attempts reached" : s.lastError,
      }));
      return;
    }

    attemptRef.current += 1;
    setState((s) => ({
      ...s,
      isReconnecting: true,
      attemptCount: attemptRef.current,
      lastError: null,
    }));

    try {
      await reconnectRef.current();
      attemptRef.current = 0;
      setState({
        isReconnecting: false,
        attemptCount: 0,
        lastError: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Reconnection failed";
      console.warn(`[WalletAutoReconnect] Attempt ${attemptRef.current}/${maxReconnectAttempts} failed:`, errorMsg);

      setState((s) => ({
        ...s,
        isReconnecting: false,
        lastError: errorMsg,
      }));

      if (attemptRef.current < maxReconnectAttempts) {
        timeoutRef.current = setTimeout(() => {
          attemptReconnectRef.current?.();
        }, reconnectRetryDelayMs);
      }
    }
  };

  // Detect disconnection (was connected, now disconnected)
  useEffect(() => {
    if (!enabled) return;

    if (prevConnectedRef.current && isDisconnected) {
      attemptRef.current = 0;
      timeoutRef.current = setTimeout(() => {
        attemptReconnectRef.current?.();
      }, 1000);
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, isDisconnected, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRetryTimeout();
    };
  }, [clearRetryTimeout]);

  // Manual retry
  const manualRetry = useCallback(() => {
    attemptRef.current = 0;
    clearRetryTimeout();
    attemptReconnectRef.current?.();
  }, [clearRetryTimeout]);

  return {
    ...state,
    isConnected,
    isConnecting,
    isDisconnected,
    manualRetry,
  };
}
