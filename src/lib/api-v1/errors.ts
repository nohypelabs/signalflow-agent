/**
 * Standardized V1 API error responses.
 * Every error includes a code, message, and documentation URL.
 */

import type { SubscriptionTier } from "@/lib/api-auth/context";

const DOC_BASE = "https://signalflow.agent/docs/api";

export interface V1ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    docUrl: string;
  };
  meta?: {
    tier?: SubscriptionTier;
    retryAfter?: number;
    quotaUsed?: number;
    quotaLimit?: number;
    upgradeUrl?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "TIER_FORBIDDEN"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "INVALID_PARAMS"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "SERVER_ERROR";

const ERROR_MAP: Record<ErrorCode, { message: string; status: number; docAnchor: string }> = {
  AUTH_REQUIRED: {
    message: "Authentication required. Provide an API key or session cookie.",
    status: 401,
    docAnchor: "auth-required",
  },
  AUTH_INVALID: {
    message: "Invalid or expired credentials.",
    status: 401,
    docAnchor: "auth-invalid",
  },
  TIER_FORBIDDEN: {
    message: "This endpoint requires a higher subscription tier.",
    status: 403,
    docAnchor: "tier-forbidden",
  },
  QUOTA_EXCEEDED: {
    message: "Daily request quota exceeded.",
    status: 429,
    docAnchor: "quota-exceeded",
  },
  RATE_LIMITED: {
    message: "Rate limit exceeded. Slow down.",
    status: 429,
    docAnchor: "rate-limited",
  },
  INVALID_PARAMS: {
    message: "Invalid query parameters.",
    status: 400,
    docAnchor: "invalid-params",
  },
  NOT_FOUND: {
    message: "Endpoint not found.",
    status: 404,
    docAnchor: "not-found",
  },
  UPSTREAM_ERROR: {
    message: "Upstream data provider error.",
    status: 502,
    docAnchor: "upstream-error",
  },
  SERVER_ERROR: {
    message: "Internal server error.",
    status: 500,
    docAnchor: "server-error",
  },
};

export function v1ApiError(
  code: ErrorCode,
  statusOverride?: number,
  meta?: V1ErrorBody["meta"],
): Response {
  const config = ERROR_MAP[code];
  const body: V1ErrorBody = {
    success: false,
    error: {
      code,
      message: config.message,
      docUrl: `${DOC_BASE}#${config.docAnchor}`,
    },
    meta,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (meta?.retryAfter) {
    headers["Retry-After"] = String(meta.retryAfter);
  }

  return new Response(JSON.stringify(body), {
    status: statusOverride ?? config.status,
    headers,
  });
}
