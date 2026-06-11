import type { Provider } from "./ai-providers";
import { getAllowedProvider } from "./ai-providers";

const DEFAULT_PROVIDERS = [
  { envKey: "MIMO_API_KEY", baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1", model: "mimo-v2.5-pro" },
  { envKey: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
];

function getDefaultProvider(): { apiKey: string; baseUrl: string; model: string } | null {
  for (const p of DEFAULT_PROVIDERS) {
    const key = process.env[p.envKey];
    if (key) return { apiKey: key, baseUrl: p.baseUrl, model: p.model };
  }
  return null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  id: string;
  choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** User-provided provider ID and key. Provider URL is resolved from an allowlist. */
  provider?: { id: Provider; apiKey: string; model?: string };
}

export async function chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const defaultProv = getDefaultProvider();
  const userProvider = options?.provider ? getAllowedProvider(options.provider.id) : undefined;
  const hasUserConfig = !!(options?.provider?.apiKey && userProvider);

  const baseUrl = hasUserConfig ? userProvider!.baseUrl : defaultProv?.baseUrl || "https://api.deepseek.com/v1";
  const model = hasUserConfig ? options.provider!.model || userProvider!.defaultModel : defaultProv?.model || "deepseek-chat";
  const apiKey = hasUserConfig ? options.provider!.apiKey : defaultProv?.apiKey || "";

  if (!apiKey) {
    throw new Error("No AI API key configured. Set MIMO_API_KEY or DEEPSEEK_API_KEY in env, or provide one in Settings.");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,  // MiMo needs more tokens for reasoning + output
    stream: false,  // Explicitly disable streaming
  };

  // DeepSeek supports json_object; other providers may not
  if (baseUrl.includes("deepseek")) {
    body.response_format = { type: "json_object" };
  }

  // MiMo reasoning model — disable thinking to use all tokens for output
  if (baseUrl.includes("mimo")) {
    body.enable_thinking = false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s timeout

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    if (errMsg.includes("abort")) {
      throw new Error(`AI request timed out after 60s from ${baseUrl}`);
    }
    throw new Error(`AI network error: ${errMsg}`);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[AI] ${res.status} from ${baseUrl}: ${text.slice(0, 200)}`);
    throw new Error(`AI ${res.status}: ${text}`);
  }

  // Parse response — handle SSE streaming and regular JSON
  const rawText = await res.text().catch(() => "");
  if (!rawText || rawText.trim().length === 0) {
    throw new Error(`AI returned empty response from ${baseUrl}`);
  }

  let content: string | undefined;

  // Try parsing as regular JSON first
  try {
    const json: ChatResponse = JSON.parse(rawText);
    const choice = json.choices?.[0];
    // MiMo puts reasoning in reasoning_content, actual output in content
    content = choice?.message?.content || (choice?.message as Record<string, unknown>)?.reasoning_content as string || undefined;
    // If content is empty but reasoning exists, extract the last part as the actual answer
    if (!content && choice?.finish_reason === "length") {
      // Try to extract from reasoning_content
      const reasoning = (choice?.message as Record<string, unknown>)?.reasoning_content as string;
      if (reasoning && reasoning.length > 50) {
        // Use the reasoning as content — it contains the analysis
        content = reasoning;
      }
    }
  } catch {
    // Not valid JSON — try SSE streaming format
    // SSE: data: {"choices":[{"delta":{"content":"..."}}]}\n\n
    const chunks: string[] = [];
    const lines = rawText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) chunks.push(delta);
          // Also check for complete message (non-streaming response in SSE wrapper)
          const msg = chunk.choices?.[0]?.message?.content;
          if (msg) chunks.push(msg);
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
    if (chunks.length > 0) {
      content = chunks.join("");
    }
  }

  if (!content) {
    console.error(`[AI] No content extracted from ${baseUrl}. Raw (first 300): ${rawText.slice(0, 300)}`);
    throw new Error(`AI returned no usable content from ${baseUrl}`);
  }
  return content;
}

/**
 * chat() variant that never sends response_format — use for freeform chat
 * where the model should return plain text, not JSON.
 */
export async function chatPlain(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const defaultProv = getDefaultProvider();
  const userProvider = options?.provider ? getAllowedProvider(options.provider.id) : undefined;
  const hasUserConfig = !!(options?.provider?.apiKey && userProvider);

  const baseUrl = hasUserConfig ? userProvider!.baseUrl : defaultProv?.baseUrl || "https://api.deepseek.com/v1";
  const model = hasUserConfig ? options.provider!.model || userProvider!.defaultModel : defaultProv?.model || "deepseek-chat";
  const apiKey = hasUserConfig ? options.provider!.apiKey : defaultProv?.apiKey || "";

  if (!apiKey) {
    throw new Error("No AI API key configured. Set MIMO_API_KEY or DEEPSEEK_API_KEY in env, or provide one in Settings.");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.5,
    max_tokens: options?.maxTokens ?? 300,
    stream: false,
  };

  if (baseUrl.includes("mimo")) {
    body.enable_thinking = false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    if (errMsg.includes("abort")) {
      throw new Error(`AI request timed out after 60s from ${baseUrl}`);
    }
    throw new Error(`AI network error: ${errMsg}`);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${text}`);
  }

  const rawText = await res.text().catch(() => "");
  if (!rawText || rawText.trim().length === 0) {
    throw new Error(`AI returned empty response from ${baseUrl}`);
  }

  let content: string | undefined;

  try {
    const json: ChatResponse = JSON.parse(rawText);
    const choice = json.choices?.[0];
    content = choice?.message?.content || (choice?.message as Record<string, unknown>)?.reasoning_content as string || undefined;
  } catch {
    const chunks: string[] = [];
    const lines = rawText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) chunks.push(delta);
          const msg = chunk.choices?.[0]?.message?.content;
          if (msg) chunks.push(msg);
        } catch { /* skip malformed */ }
      }
    }
    if (chunks.length > 0) content = chunks.join("");
  }

  if (!content) {
    throw new Error(`AI returned no usable content from ${baseUrl}`);
  }
  return content;
}
