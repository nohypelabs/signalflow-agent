import type { AIProvider, AIConfig } from "./types/datasource";

export type { AIProvider, AIConfig };

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o3-mini", "o1", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4",
    models: ["claude-opus-4", "claude-sonnet-4", "claude-3.5-haiku"],
  },
  {
    id: "google",
    name: "Google (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
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
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "qwen/qwen3-235b-a22b",
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi (MiMo)",
    baseUrl: "https://api.xiaomi.com/v1",
    defaultModel: "mimo-v2.5-pro",
    models: ["mimo-v2.5-pro", "mimo-v2.5-flash"],
  },
  {
    id: "zhipu",
    name: "Zhipu AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-plus",
    models: ["glm-4-plus", "glm-4-flash", "glm-4-long", "glm-4-air"],
  },
  {
    id: "qwen",
    name: "Alibaba (Qwen)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-max",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    models: ["mistral-large-latest", "mistral-medium-latest", "codestral-latest", "mistral-small-latest"],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3",
    models: ["grok-3", "grok-3-mini", "grok-2"],
  },
];

export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}
