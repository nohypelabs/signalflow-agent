"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wallet-config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

const rainbowTheme = darkTheme({
  accentColor: "#00E5A8",
  accentColorForeground: "#05070D",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
