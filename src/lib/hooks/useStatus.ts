"use client";

import { useQuery } from "@tanstack/react-query";
import { parseApiResponse } from "@/lib/api/client";

export interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "no_key";
  detail: string;
  latencyMs: number;
}

interface StatusParams {
  providerId?: string;
  model?: string;
  apiKey?: string;
}

export function useStatus(params?: StatusParams) {
  const hasSecret = !!params?.apiKey;

  const query = useQuery<ServiceStatus[], Error>({
    queryKey: ["status", params?.providerId, params?.model, params?.apiKey],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.providerId) qs.set("provider", params.providerId);
      if (params?.model) qs.set("model", params.model);
      const url = `/api/status${!hasSecret && qs.toString() ? `?${qs}` : ""}`;
      const res = await fetch(url, hasSecret
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: params?.providerId,
              model: params?.model,
              apiKey: params?.apiKey,
            }),
          }
        : undefined);
      const json = await parseApiResponse<{ services: ServiceStatus[] }>(res);
      return json.services;
    },
    staleTime: 10_000,
  });

  return {
    services: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
  };
}
