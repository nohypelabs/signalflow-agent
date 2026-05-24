export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "deepseek",
    name: "Deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o3-mini", "o1"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-opus-4",
      "google/gemini-2.5-pro",
      "deepseek/deepseek-chat",
    ],
  },
];

export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export interface AIConfig {
  providerId: string;
  apiKey: string;
  model: string;
}
