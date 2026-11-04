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

/* ---------- request pipeline (Decorator) ----------
 * Each layer wraps a `Transport` and returns a new one, so timeouts and retries
 * stay out of the repositories. `authed.ts` adds the Bearer token on top. */

/** One HTTP exchange with its body parsed, before API errors are thrown. */
export interface RawResponse {
  ok: boolean;
  status: number;
  payload: unknown;
}

export type Transport = (url: string, init: RequestInit) => Promise<RawResponse>;

const UNREACHABLE = "Could not reach CityPulse. The server may be waking up; please try again.";
const TOO_SLOW = "CityPulse is taking too long to respond. Please try again.";

/** Statuses a restarting or waking Render instance answers with. */
const RETRY_STATUSES = new Set([502, 503, 504]);

const isIdempotent = (init: RequestInit) => {
  const method = (init.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
};

/**
 * A sleeping Render instance holds requests while it wakes (~55 s measured),
 * so reads get a minute before they are cut off and retried. Uploads and AI
 * checks get longer.
 */
const timeoutFor = (init: RequestInit) => (isIdempotent(init) ? 60_000 : 90_000);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Innermost layer: `fetch` plus JSON parsing. */
export const fetchTransport: Transport = async (url, init) => {
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, init);
    text = await response.text();
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }

  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }
  return { ok: response.ok, status: response.status, payload };
};

/** Decorator: aborts a request that runs longer than its time limit. */
export function withTimeout(
  send: Transport,
  limitMs: number | ((init: RequestInit) => number),
): Transport {
  return async (url, init) => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      typeof limitMs === "number" ? limitMs : limitMs(init),
    );
    // the caller can still cancel (e.g. when a component unmounts)
    const outer = init.signal;
    const forward = () => controller.abort();
    if (outer?.aborted) controller.abort();
    else outer?.addEventListener("abort", forward, { once: true });

    try {
      return await send(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new ApiError(TOO_SLOW, 0);
      throw error;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener("abort", forward);
    }
  };
}

export interface RetryOptions {
  retries?: number;
  /** ms to wait before retry number `attempt` (0-based) */
  delayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Decorator: retries reads that failed while the API was unreachable or
 * restarting. Writes are never retried, so nothing is submitted twice.
 */
export function withRetry(
  send: Transport,
  { retries = 2, delayMs = (attempt) => 1_000 * 3 ** attempt, sleep = wait }: RetryOptions = {},
): Transport {
  return async (url, init) => {
    for (let attempt = 0; ; attempt++) {
      const lastTry = attempt >= retries || !isIdempotent(init);
      try {
        const response = await send(url, init);
        if (lastTry || !RETRY_STATUSES.has(response.status)) return response;
      } catch (error) {
        const transient = error instanceof ApiError && error.status === 0;
        if (lastTry || !transient || init.signal?.aborted) throw error;
      }
      await sleep(delayMs(attempt));
    }
  };
}

const transport = withRetry(withTimeout(fetchTransport, timeoutFor));

/** Fetch JSON from the CityPulse API and normalize transport/API errors. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const { ok, status, payload } = await transport(`${API_URL}${path}`, { ...init, headers });
  if (!ok) throw new ApiError(errorMessage(payload, status), status, payload);
  return payload as T;
}
