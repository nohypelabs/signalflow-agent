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
  /** User-provided config — overrides server defaults when present */
  provider?: { baseUrl: string; apiKey: string; model: string };
}

export async function chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const defaultProv = getDefaultProvider();
  const hasUserConfig = options?.provider?.apiKey;

  const baseUrl = options?.provider?.baseUrl || defaultProv?.baseUrl || "https://api.deepseek.com/v1";
  const model = options?.provider?.model || defaultProv?.model || "deepseek-chat";
  const apiKey = hasUserConfig ? options.provider!.apiKey : defaultProv?.apiKey || "";

  if (!apiKey) {
    throw new Error("No AI API key configured. Set MIMO_API_KEY or DEEPSEEK_API_KEY in env, or provide one in Settings.");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 1500,
  };

  // DeepSeek supports json_object; other providers may not
  if (baseUrl.includes("deepseek")) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${text}`);
  }

  const json: ChatResponse = await res.json();
  const content = json.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");
  return content;
}
