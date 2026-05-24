const DEFAULT_BASE = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";

function serverKey(): string {
  return process.env.DEEPSEEK_API_KEY || "";
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
  const hasUserConfig = options?.provider?.apiKey;
  const baseUrl = options?.provider?.baseUrl || DEFAULT_BASE;
  const model = options?.provider?.model || DEFAULT_MODEL;
  const apiKey = hasUserConfig ? options.provider!.apiKey : serverKey();

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 1500,
  };

  // Deepseek supports json_object; OpenAI/OpenRouter use json_schema or json_object depending on model
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
