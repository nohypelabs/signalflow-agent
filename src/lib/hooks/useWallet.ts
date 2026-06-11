"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Connector } from "wagmi";

export type WalletConnectionPreference = "injected" | "walletConnect";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

function isWalletConnectConnector(connector: Connector) {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  return id.includes("walletconnect") || name.includes("walletconnect");
}

function isInjectedConnector(connector: Connector) {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  return id === "injected" || name.includes("metamask") || name.includes("injected");
}

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnectedSafe = mounted ? isConnected : false;
  const hasInjectedProvider = mounted && typeof window !== "undefined" && "ethereum" in window;
  const walletConnectConfigured = Boolean(walletConnectProjectId);

  const getConnector = (preference?: WalletConnectionPreference) => {
    const injectedConnector = connectors.find(isInjectedConnector);
    const walletConnectConnector = connectors.find(isWalletConnectConnector);

    if (preference === "walletConnect") {
      if (!walletConnectConfigured) {
        throw new Error("WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.");
      }
      if (!walletConnectConnector) {
        throw new Error("WalletConnect connector is unavailable. Check wallet configuration.");
      }
      return walletConnectConnector;
    }

    if (preference === "injected") {
      if (!hasInjectedProvider || !injectedConnector) {
        throw new Error("No browser wallet found. Install MetaMask or use WalletConnect.");
      }
      return injectedConnector;
    }

    if (hasInjectedProvider && injectedConnector) return injectedConnector;
    if (walletConnectConfigured && walletConnectConnector) return walletConnectConnector;

    if (!hasInjectedProvider && !walletConnectConfigured) {
      throw new Error(
        "No browser wallet found and WalletConnect is not configured. Install MetaMask or set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.",
      );
    }

    throw new Error("No wallet connector available. Check wallet configuration.");
  };

  const connect = async (preference?: WalletConnectionPreference) => {
    await connectAsync({ connector: getConnector(preference) });
  };

  const disconnect = async () => {
    // 1. Revoke MetaMask browser-level permission so it prompts again on next connect
    const win = window as unknown as { ethereum?: EthereumProvider } | undefined;
    if (typeof window !== "undefined" && win?.ethereum) {
      try {
        await win.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // MetaMask-specific, silently ignore
      }
    }

    // 2. Disconnect wagmi session
    await disconnectAsync();

    // 3. Clear ALL wagmi persisted state
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("wagmi") || key.startsWith("wc:") || key.startsWith("walletconnect")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // localStorage unavailable, silently ignore
    }

    // 4. Reload page to fully reset wagmi in-memory state
    //    Without this, connectAsync reuses the cached connector and auto-connects
    window.location.reload();
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  return {
    address,
    shortAddress,
    isConnected: isConnectedSafe,
    chainId,
    connect,
    disconnect,
    hasInjectedProvider,
    walletConnectConfigured,
  };
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
