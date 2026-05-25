import { createConfig, http } from "wagmi";
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

// wagmi v3 infers connector array type from the first element; walletConnect
// has a different storage type than injected, so we widen to any[].
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connectors: any[] = [injected()];
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
