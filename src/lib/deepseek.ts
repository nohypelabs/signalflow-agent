const BASE = "https://api.deepseek.com/v1";
const MODEL = "deepseek-chat";

function apiKey(): string {
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

export async function chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Deepseek ${res.status}: ${text}`);
  }

  const json: ChatResponse = await res.json();
  const content = json.choices[0]?.message?.content;
  if (!content) throw new Error("Deepseek returned empty response");
  return content;
}
