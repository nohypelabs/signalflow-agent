"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const connect = async () => {
    const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
    if (typeof window !== "undefined" && "ethereum" in window) {
      await connectAsync({ connector: injected() });
    } else if (wcProjectId) {
      await connectAsync({
        connector: walletConnect({ projectId: wcProjectId, showQrModal: true }),
      });
    } else {
      throw new Error(
        "No wallet provider found. Install MetaMask extension (desktop) or configure WalletConnect (mobile).",
      );
    }
  };

  const disconnect = async () => {
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
    await disconnectAsync();
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  return { address, shortAddress, isConnected, chainId, connect, disconnect };
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
