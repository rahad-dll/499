import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  _internal,
  clearApiSession,
  readApiSession,
  saveApiSession,
  sessionFromTokens,
} from "./api-session.ts";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function token(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

const runtime = globalThis as unknown as Record<string, unknown>;

describe("API session storage", () => {
  beforeEach(() => {
    runtime.window = {};
    runtime.localStorage = new MemoryStorage();
    runtime.sessionStorage = new MemoryStorage();
  });

  afterEach(() => {
    delete runtime.window;
    delete runtime.localStorage;
    delete runtime.sessionStorage;
  });

  it("builds user and expiry data from an access token", () => {
    const access = token({
      sub: "user-1",
      email: "owner@example.com",
      role: "owner",
      exp: 2_000_000_000,
    });
    const session = sessionFromTokens(
      { access_token: access, refresh_token: "refresh" },
      true,
      undefined,
      "Parking Owner",
    );

    assert.equal(session.user.id, "user-1");
    assert.equal(session.user.full_name, "Parking Owner");
    assert.equal(session.expiresAt, 2_000_000_000_000);
    assert.equal(session.remember, true);
  });

  it("persists remembered sessions in local storage", () => {
    const session = sessionFromTokens(
      {
        access_token: token({
          sub: "user-1",
          email: "owner@example.com",
          role: "owner",
          exp: 2_000_000_000,
        }),
        refresh_token: "refresh",
      },
      true,
    );

    saveApiSession(session);
    assert.deepEqual(readApiSession(), session);
    assert.equal(sessionStorage.getItem(_internal.SESSION_KEY), null);
  });

  it("uses session storage when remember-me is disabled", () => {
    const session = sessionFromTokens(
      {
        access_token: token({
          sub: "user-2",
          email: "driver@example.com",
          role: "driver",
          exp: 2_000_000_000,
        }),
        refresh_token: "refresh",
      },
      false,
    );

    saveApiSession(session);
    assert.deepEqual(readApiSession(), session);
    assert.equal(localStorage.getItem(_internal.SESSION_KEY), null);
  });

  it("clears invalid stored JSON and rejects malformed tokens", () => {
    localStorage.setItem(_internal.SESSION_KEY, "not-json");
    assert.equal(readApiSession(), null);
    assert.equal(localStorage.getItem(_internal.SESSION_KEY), null);
    assert.throws(
      () =>
        sessionFromTokens(
          { access_token: "bad-token", refresh_token: "refresh" },
          false,
        ),
      /invalid access token/i,
    );
  });

  it("clears both storage locations", () => {
    localStorage.setItem(_internal.SESSION_KEY, "local");
    sessionStorage.setItem(_internal.SESSION_KEY, "session");
    clearApiSession();
    assert.equal(localStorage.length, 0);
    assert.equal(sessionStorage.length, 0);
  });
});
