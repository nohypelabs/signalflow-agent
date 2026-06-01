"use client";

import { useEffect, useState } from "react";
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
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const qs = new URLSearchParams();
        if (params?.providerId) qs.set("provider", params.providerId);
        if (params?.model) qs.set("model", params.model);
        const hasSecret = !!params?.apiKey;
        const url = `/api/status${!hasSecret && qs.toString() ? `?${qs}` : ""}`;
        const res = await fetch(url, hasSecret
          ? {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: params?.providerId,
                model: params?.model,
                apiKey: params?.apiKey,
              }),
            }
          : { cache: "no-store" });
        const json = await parseApiResponse<{ services: ServiceStatus[] }>(res);
        if (!cancelled) {
          setServices(json.services);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params?.providerId, params?.model, params?.apiKey]);

  return { services, loading, error };
}
