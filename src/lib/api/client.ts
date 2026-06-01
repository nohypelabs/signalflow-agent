import type { ApiResponse } from "./response";

function isApiResponse<T>(body: unknown): body is ApiResponse<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    typeof (body as { success: unknown }).success === "boolean"
  );
}

export function unwrapApiResponse<T>(body: unknown): T {
  if (!isApiResponse<T>(body)) {
    return body as T;
  }

  if (!body.success) {
    throw new Error(body.error);
  }

  return body.data;
}

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (isApiResponse<T>(body) && !body.success) {
      throw new Error(body.error);
    }

    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      throw new Error((body as { error: string }).error);
    }

    throw new Error(`HTTP ${res.status}`);
  }

  return unwrapApiResponse<T>(body);
}
