"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const connect = async () => {
    await connectAsync({ connector: injected() });
  };

  const disconnect = async () => {
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
