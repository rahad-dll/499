import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  ApiError,
  apiRequest,
  withRetry,
  withTimeout,
  type RawResponse,
  type Transport,
} from "./client.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("apiRequest", () => {
  it("returns successful JSON and adds the JSON content type", async () => {
    globalThis.fetch = async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await apiRequest<{ ok: boolean }>("/test", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
    });
    assert.deepEqual(result, { ok: true });
  });

  it("returns null for a successful empty response", async () => {
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await apiRequest<null>("/empty"), null);
  });

  it("normalizes API validation errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: ["phone is invalid", "role is invalid"] }), {
        status: 400,
      });

    await assert.rejects(
      apiRequest("/bad"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "phone is invalid. role is invalid",
    );
  });

  it("reports an unreachable API clearly", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("network down");
    };

    // a write, so the pipeline does not retry it
    await assert.rejects(
      apiRequest("/offline", { method: "POST" }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 0 &&
        /Could not reach CityPulse/.test(error.message),
    );
  });
});

const noWait = async () => {};

function scripted(...replies: (RawResponse | Error)[]): Transport & { calls: number } {
  const send = Object.assign(
    async () => {
      const reply = replies[Math.min(send.calls++, replies.length - 1)];
      if (reply instanceof Error) throw reply;
      return reply;
    },
    { calls: 0 },
  );
  return send;
}

describe("withRetry", () => {
  it("retries a read while the API is waking up", async () => {
    const send = scripted(
      new ApiError("down", 0),
      { ok: false, status: 503, payload: null },
      { ok: true, status: 200, payload: "ok" },
    );
    const result = await withRetry(send, { sleep: noWait })("/x", {});
    assert.equal(result.payload, "ok");
    assert.equal(send.calls, 3);
  });

  it("never retries a write", async () => {
    const send = scripted({ ok: false, status: 503, payload: null });
    const result = await withRetry(send, { sleep: noWait })("/x", { method: "POST" });
    assert.equal(result.status, 503);
    assert.equal(send.calls, 1);
  });

  it("does not retry API errors such as 404", async () => {
    const send = scripted({ ok: false, status: 404, payload: null });
    await withRetry(send, { sleep: noWait })("/x", {});
    assert.equal(send.calls, 1);
  });

  it("gives up after the last retry", async () => {
    const send = scripted(new ApiError("down", 0));
    await assert.rejects(withRetry(send, { retries: 2, sleep: noWait })("/x", {}), ApiError);
    assert.equal(send.calls, 3);
  });
});

describe("withTimeout", () => {
  it("aborts a request that takes too long", async () => {
    const hang: Transport = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new ApiError("aborted", 0)));
      });
    await assert.rejects(
      withTimeout(hang, 10)("/slow", {}),
      (error: unknown) => error instanceof ApiError && /taking too long/.test(error.message),
    );
  });

  it("passes a caller's cancel through", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const send: Transport = async (_url, init) => {
      seen = init.signal ?? undefined;
      controller.abort();
      return { ok: true, status: 200, payload: null };
    };
    await withTimeout(send, 1_000)("/x", { signal: controller.signal });
    assert.equal(seen?.aborted, true);
  });
});
