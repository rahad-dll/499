import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ApiError, apiRequest } from "./client.ts";

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

    await assert.rejects(
      apiRequest("/offline"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 0 &&
        /Could not reach CityPulse/.test(error.message),
    );
  });
});
