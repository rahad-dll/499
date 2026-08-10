const DEFAULT_API_URL = "https://four99-b6wg.onrender.com";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/$/, "");

interface ApiErrorPayload {
  error?: string;
  message?: string | string[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const data = payload as ApiErrorPayload;
    if (Array.isArray(data.message)) return data.message.join(". ");
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }
  return `Request failed (${status})`;
}

/** Fetch JSON from the CityPulse API and normalize transport/API errors. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      "Could not reach CityPulse. The server may be waking up; please try again.",
      0,
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}
