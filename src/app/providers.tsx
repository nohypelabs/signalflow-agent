"use client";

import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wallet-config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default for fast signal/ticker feel + reduced load
      staleTime: 8_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      // Note: refetchInterval is set per-query (e.g. 10s for tickers, 60s for signals)
      // For suspense usage: wrap consumers in <Suspense> and use useSuspenseQuery variants if needed
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
