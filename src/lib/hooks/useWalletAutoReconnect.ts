"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAccount, useReconnect } from "wagmi";

interface UseWalletAutoReconnectOptions {
  /** Max reconnection attempts before giving up */
  maxAttempts?: number;
  /** Delay between reconnection attempts in ms */
  retryDelayMs?: number;
  /** Enable/disable auto-reconnect */
  enabled?: boolean;
}

interface WalletReconnectState {
  isReconnecting: boolean;
  attemptCount: number;
  lastError: string | null;
}

/**
 * Auto-reconnect wallet hook.
 * Detects disconnections and attempts to reconnect gracefully.
 * Shows status without blocking the UI.
 */
export function useWalletAutoReconnect(options: UseWalletAutoReconnectOptions = {}) {
  const {
    maxAttempts = 3,
    retryDelayMs = 2000,
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

  const clearRetryTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const attemptReconnect = useCallback(async () => {
    if (!enabled || attemptRef.current >= maxAttempts) {
      setState((s) => ({
        ...s,
        isReconnecting: false,
        lastError: attemptRef.current >= maxAttempts ? "Max reconnection attempts reached" : s.lastError,
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
      await reconnect();
      // Success — reset state
      attemptRef.current = 0;
      setState({
        isReconnecting: false,
        attemptCount: 0,
        lastError: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Reconnection failed";
      console.warn(`[WalletAutoReconnect] Attempt ${attemptRef.current}/${maxAttempts} failed:`, errorMsg);

      setState((s) => ({
        ...s,
        isReconnecting: false,
        lastError: errorMsg,
      }));

      // Schedule retry if we haven't hit the limit
      if (attemptRef.current < maxAttempts) {
        timeoutRef.current = setTimeout(attemptReconnect, retryDelayMs);
      }
    }
  }, [enabled, maxAttempts, retryDelayMs, reconnect]);

  // Detect disconnection (was connected, now disconnected)
  useEffect(() => {
    if (!enabled) return;

    if (prevConnectedRef.current && isDisconnected) {
      // Was connected, now disconnected — attempt reconnect
      attemptRef.current = 0;
      timeoutRef.current = setTimeout(attemptReconnect, 1000);
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, isDisconnected, enabled, attemptReconnect]);

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
    attemptReconnect();
  }, [clearRetryTimeout, attemptReconnect]);

  return {
    ...state,
    isConnected,
    isConnecting,
    isDisconnected,
    manualRetry,
  };
}
