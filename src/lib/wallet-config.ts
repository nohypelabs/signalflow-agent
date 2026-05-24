import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const valuechain = defineChain({
  id: 286623,
  name: "ValueChain",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.valuechain.xyz"] },
  },
});

export const config = createConfig({
  chains: [valuechain],
  connectors: [injected()],
  transports: {
    [valuechain.id]: http(),
  },
});
