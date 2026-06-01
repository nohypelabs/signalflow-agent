"use client";

import { useWallet } from "../hooks/useWallet";

export function useWalletProviderState() {
  const {
    address,
    shortAddress,
    isConnected,
    chainId,
    connect: connectWallet,
    disconnect: disconnectWallet,
  } = useWallet();

  return {
    address,
    shortAddress,
    isConnected,
    chainId,
    connectWallet,
    disconnectWallet,
  };
}
