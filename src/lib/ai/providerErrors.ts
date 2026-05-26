export type AIErrorCode =
  | "invalid_key"
  | "insufficient_balance"
  | "rate_limited"
  | "provider_unavailable"
  | "failed_to_reach"
  | "not_configured"
  | "unknown";

export interface AIError {
  code: AIErrorCode;
  message: string;
  retryable: boolean;
}

const ERROR_MESSAGES: Record<AIErrorCode, string> = {
  invalid_key: "Invalid API key. Check your AI provider settings.",
  insufficient_balance: "Insufficient balance on your AI provider account.",
  rate_limited: "Rate limited by AI provider. Try again in a moment.",
  provider_unavailable: "AI provider is temporarily unavailable.",
  failed_to_reach: "Could not reach AI provider. Check your connection.",
  not_configured: "AI provider not configured. Open Settings to add your API key.",
  unknown: "An unexpected error occurred.",
};

export function mapAIError(err: unknown): AIError {
  const msg = err instanceof Error ? err.message : String(err);

  // Parse HTTP status from chat() error format: "AI {status}: {body}"
  const statusMatch = msg.match(/AI (\d+)/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    switch (status) {
      case 401:
        return { code: "invalid_key", message: ERROR_MESSAGES.invalid_key, retryable: false };
      case 402:
        return { code: "insufficient_balance", message: ERROR_MESSAGES.insufficient_balance, retryable: false };
      case 429:
        return { code: "rate_limited", message: ERROR_MESSAGES.rate_limited, retryable: true };
      case 500:
      case 502:
      case 503:
        return { code: "provider_unavailable", message: ERROR_MESSAGES.provider_unavailable, retryable: true };
    }
  }

  // Network errors
  const lowerMsg = msg.toLowerCase();
  if (
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("enotfound") ||
    lowerMsg.includes("etimedout")
  ) {
    return { code: "failed_to_reach", message: ERROR_MESSAGES.failed_to_reach, retryable: true };
  }

  return { code: "unknown", message: ERROR_MESSAGES.unknown, retryable: true };
}
