import { authRepository } from "@/lib/auth/repository";
import { ApiError, apiRequest } from "./client";

/** `apiRequest` with the current Bearer token (refreshed when close to expiry). */
export async function authedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await authRepository.getAccessToken();
  if (!token) {
    throw new ApiError("Your session has expired. Please log in again.", 401);
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return apiRequest<T>(path, { ...init, headers });
}

/**
 * Some list endpoints may return a bare array or a paginated envelope.
 * Accept both so pages don't break if the API adds pagination.
 */
export function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const envelope = payload as { data?: unknown; items?: unknown; results?: unknown };
    for (const candidate of [envelope.data, envelope.items, envelope.results]) {
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }
  return [];
}
