"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { valuechain } from "@/lib/valuechain";
import StatusDot from "@/components/ui/StatusDot";

export default function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const correctChain = chainId === valuechain.id;
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="cursor-pointer px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50 backdrop-blur-sm transition-all whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Connect Wallet</span>
                    <span className="sm:hidden">Connect</span>
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== valuechain.id) {
                return (
                  <button
                    onClick={openChainModal}
                    className="cursor-pointer px-2 py-1.5 text-[11px] font-bold rounded-lg bg-sell/10 text-sell border border-sell/30 hover:bg-sell/20 transition-all whitespace-nowrap"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-inset border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted transition-colors cursor-pointer"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        alt={chain.name ?? "Chain"}
                        src={chain.iconUrl}
                        width={14}
                        height={14}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-[10px] font-medium hidden sm:inline">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="flex cursor-pointer items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-inset border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-muted transition-colors"
                  >
                    <StatusDot status="live" size="sm" />
                    <span className="text-[11px] font-mono font-medium hidden sm:inline">
                      {account.displayName}
                    </span>
                    <span className="text-[11px] font-mono font-medium sm:hidden">
                      {account.displayName?.slice(0, 6)}...
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
