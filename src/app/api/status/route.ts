import { NextResponse } from "next/server";
import { getCurrencies } from "@/lib/sosovalue";
import { getTickers } from "@/lib/sodex";
import { chat } from "@/lib/deepseek";

interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "no_key";
  detail: string;
  latencyMs: number;
}

export async function GET() {
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

    // Deepseek
    (async () => {
      if (!process.env.DEEPSEEK_API_KEY) {
        return { name: "Deepseek AI", status: "no_key" as const, detail: "DEEPSEEK_API_KEY not set", latencyMs: 0 };
      }
      const start = Date.now();
      try {
        await chat([{ role: "user", content: "ping" }], { maxTokens: 5 });
        return { name: "Deepseek AI", status: "connected" as const, detail: "Model ready", latencyMs: Date.now() - start };
      } catch {
        return { name: "Deepseek AI", status: "error" as const, detail: "Connection failed", latencyMs: Date.now() - start };
      }
    })(),
  ];

  const services = await Promise.all(checks);
  return NextResponse.json({ services, checked: Date.now() });
}
