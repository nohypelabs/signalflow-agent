"use client";

import { useAccount, useDisconnect } from "wagmi";

export function useWalletProviderState() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  return {
    address,
    shortAddress,
    isConnected,
    chainId,
    disconnectWallet: disconnect,
  };
}
