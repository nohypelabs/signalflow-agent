import { NextRequest } from "next/server";
import { chatPlain } from "@/lib/deepseek";
import { jsonNoCache } from "@/lib/api/no-cache";
import { mapAIError } from "@/lib/ai/providerErrors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { buildSystemPrompt } from "@/lib/ai/signal-chat";
import type { Signal, LiveSignalDimensions } from "@/lib/types/signal";
import type { Provider } from "@/lib/ai-providers";
import { getAllowedProvider } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context: {
    signal: Signal | null;
    liveDims: LiveSignalDimensions | null;
    sourceFlags?: Record<string, boolean | number>;
    tradingType?: string;
    livePrice?: number | null;
  };
  provider?: string;
  apiKey?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "chat");
  if (limited) return limited;

  try {
    const body: ChatRequestBody = await req.json().catch(() => {
      throw new Error("Invalid JSON body");
    });

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonNoCache({ error: "messages array is required" }, { status: 400 });
    }

    // Only keep last 3 exchanges (6 messages) to save tokens
    const recentMessages = body.messages.slice(-6);

    const systemPrompt = buildSystemPrompt({
      signal: body.context?.signal ?? null,
      liveDims: body.context?.liveDims ?? null,
      sourceFlags: body.context?.sourceFlags,
      tradingType: body.context?.tradingType,
      livePrice: body.context?.livePrice,
    });

    // Resolve user-provided provider if given
    let userProvider: { id: Provider; apiKey: string; model?: string } | undefined;
    if (body.provider && body.apiKey) {
      const resolved = getAllowedProvider(body.provider);
      if (!resolved) {
        return jsonNoCache({ error: "Unsupported AI provider" }, { status: 400 });
      }
      userProvider = {
        id: resolved.id as Provider,
        apiKey: body.apiKey,
        model: body.model || resolved.defaultModel,
      };
    }

    const reply = await chatPlain(
      [
        { role: "system", content: systemPrompt },
        ...recentMessages,
      ],
      userProvider ? { provider: userProvider, maxTokens: 300 } : { maxTokens: 300 },
    );

    return jsonNoCache({ reply });
  } catch (err) {
    const mapped = mapAIError(err);
    console.error("/api/chat error:", mapped.code, mapped.message);
    return jsonNoCache(
      { error: mapped.message, retryable: mapped.retryable },
      { status: 502 },
    );
  }
}
