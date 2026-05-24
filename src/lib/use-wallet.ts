"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const connect = async () => {
    // Always use fresh connection — wagmi's injected() connector
    // will trigger eth_requestAccounts which shows MetaMask account picker
    await connectAsync({ connector: injected() });
  };

  const disconnect = async () => {
    // Revoke MetaMask permissions so next connect shows full wallet selector.
    // Without this, MetaMask auto-approves reconnection to the same account.
    const win = window as unknown as { ethereum?: EthereumProvider } | undefined;
    if (typeof window !== "undefined" && win?.ethereum) {
      try {
        await win.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // wallet_revokePermissions is MetaMask-specific — silently ignore if unsupported
      }
    }

    await disconnectAsync();
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  return {
    address,
    shortAddress,
    isConnected,
    chainId,
    connect,
    disconnect,
  };
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
