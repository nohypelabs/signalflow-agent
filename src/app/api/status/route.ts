import { getCurrencies } from "@/lib/sosovalue";
import { getTickers } from "@/lib/sodex";
import { chat } from "@/lib/deepseek";
import type { Provider } from "@/lib/ai-providers";
import { getAllowedProvider } from "@/lib/ai-providers";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "no_key";
  detail: string;
  latencyMs: number;
}

async function buildStatus(providerId?: string, model?: string, apiKey?: string) {
  const provider = providerId ? getAllowedProvider(providerId) : undefined;
  if (providerId && !provider) {
    return jsonNoCache({ error: "Unsupported AI provider" }, { status: 400 });
  }

  const aiName = provider ? provider.name : "AI Model";

  const checks: Promise<ServiceStatus>[] = [
    // SoSoValue
    (async () => {
      if (!process.env.SOSOVALUE_API_KEY) {
        return { name: "SoSoValue API", status: "no_key" as const, detail: "SOSOVALUE_API_KEY not set", latencyMs: 0 };
      }
      const start = Date.now();
      try {
        const c = await getCurrencies();
        return {
          name: "SoSoValue API",
          status: "connected" as const,
          detail: `${c.length} currencies loaded`,
          latencyMs: Date.now() - start,
        };
      } catch {
        return { name: "SoSoValue API", status: "error" as const, detail: "Connection failed", latencyMs: Date.now() - start };
      }
    })(),

    // SoDEX
    (async () => {
      const start = Date.now();
      try {
        const t = await getTickers();
        return {
          name: "SoDEX",
          status: "connected" as const,
          detail: `${t.length} pairs live (${process.env.SODEX_NETWORK || "mainnet"})`,
          latencyMs: Date.now() - start,
        };
      } catch {
        return { name: "SoDEX", status: "error" as const, detail: "Connection failed", latencyMs: Date.now() - start };
      }
    })(),

    // AI Model — dynamic based on selected provider
    (async () => {
      // Determine which key to check
      const hasUserKey = !!apiKey;
      const hasServerKey = !!(process.env.MIMO_API_KEY || process.env.DEEPSEEK_API_KEY);

      if (!hasUserKey && !hasServerKey) {
        return {
          name: aiName,
          status: "no_key" as const,
          detail: provider ? `No ${provider.name} API key configured` : "No AI API key configured",
          latencyMs: 0,
        };
      }

      const start = Date.now();
      try {
        // Build provider config for the chat function
        const providerConfig = provider && apiKey
          ? { id: provider.id as Provider, apiKey, model: model || provider.defaultModel }
          : undefined;

        await chat(
          [{ role: "user", content: "ping" }],
          { maxTokens: 5, ...(providerConfig ? { provider: providerConfig } : {}) },
        );

        const modelLabel = model || provider?.defaultModel || "server default";
        return {
          name: aiName,
          status: "connected" as const,
          detail: `${modelLabel} ready`,
          latencyMs: Date.now() - start,
        };
      } catch {
        return {
          name: aiName,
          status: "error" as const,
          detail: "Connection failed",
          latencyMs: Date.now() - start,
        };
      }
    })(),
  ];

  const services = await Promise.all(checks);
  return jsonNoCache({ services, checked: Date.now() });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const providerId = url.searchParams.get("provider") || undefined;
  const model = url.searchParams.get("model") || undefined;

  return buildStatus(providerId, model);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const providerId = typeof body.provider === "string" ? body.provider : undefined;
  const model = typeof body.model === "string" ? body.model : undefined;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;

  return buildStatus(providerId, model, apiKey);
}
