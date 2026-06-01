import { jsonNoCache } from "./no-cache";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T, message = "", init?: ResponseInit) {
  return jsonNoCache<ApiSuccess<T>>({ success: true, data, message }, init);
}

export function apiError(error: string, status = 500, init?: ResponseInit) {
  return jsonNoCache<ApiError>({ success: false, error }, { ...init, status });
}
