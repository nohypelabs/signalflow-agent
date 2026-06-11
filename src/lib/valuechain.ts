import { defineChain } from 'viem';

export const valuechain = defineChain({
  id: 286623,
  name: 'ValueChain',
  nativeCurrency: { name: 'SOSO', symbol: 'SOSO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.valuechain.xyz'] },
  },
});
