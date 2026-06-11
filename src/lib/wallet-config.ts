import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { valuechain } from './valuechain';
import { http } from 'wagmi';
import {
  metaMaskWallet,
  phantomWallet,
  walletConnectWallet,
  coinbaseWallet,
  braveWallet,
  okxWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const config = getDefaultConfig({
  appName: 'SignalFlow Agent',
  projectId: projectId || 'placeholder',
  chains: [valuechain],
  transports: {
    [valuechain.id]: http(),
  },
  wallets: [
    {
      groupName: 'Installed',
      wallets: [
        metaMaskWallet,
        phantomWallet,
        okxWallet,
        braveWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
});
