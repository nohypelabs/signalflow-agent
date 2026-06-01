import { NextResponse } from "next/server";
import type { ApiResponse } from "./response";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isApiResponse(data: unknown): data is ApiResponse<unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success: unknown }).success !== undefined
  );
}

function normalizePayload(data: unknown, init?: ResponseInit): ApiResponse<unknown> {
  if (isApiResponse(data)) {
    return data;
  }

  const status = init?.status ?? 200;
  if (
    status >= 400 &&
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return { ...(data as Record<string, unknown>), success: false, error: (data as { error: string }).error };
  }

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), success: true, data, message: "" };
  }

  return { success: true, data, message: "" };
}

export function jsonNoCache<T = unknown>(data: T, init?: ResponseInit) {
  return NextResponse.json(normalizePayload(data, init), {
    ...init,
    headers: {
      ...NO_CACHE_HEADERS,
      ...init?.headers,
    },
  });
}
