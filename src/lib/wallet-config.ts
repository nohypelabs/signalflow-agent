import { createConfig, http } from "wagmi";
import type { CreateConnectorFn } from "wagmi";
import { defineChain } from "viem";
import { injected, walletConnect } from "wagmi/connectors";

export const valuechain = defineChain({
  id: 286623,
  name: "ValueChain",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.valuechain.xyz"] },
  },
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const connectors: CreateConnectorFn[] = [injected()];
if (projectId) {
  connectors.push(
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  );
}

export const config = createConfig({
  chains: [valuechain],
  connectors,
  transports: {
    [valuechain.id]: http(),
  },
});
