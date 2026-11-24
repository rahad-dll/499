import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeAccessToken, sessionFieldsFromTokens } from "./tokens.ts";

function token(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

describe("decodeAccessToken", () => {
  it("reads the claims of an API access token", () => {
    const claims = decodeAccessToken(
      token({ sub: "user-1", email: "admin@example.com", role: "admin", exp: 2_000_000_000 }),
    );
    assert.deepEqual(claims, {
      sub: "user-1",
      email: "admin@example.com",
      role: "admin",
      exp: 2_000_000_000,
    });
  });

  it("rejects malformed and incomplete tokens", () => {
    assert.throws(() => decodeAccessToken("bad-token"), /invalid access token/i);
    assert.throws(() => decodeAccessToken("a.not-base64-json.c"), /invalid access token/i);
    assert.throws(
      () => decodeAccessToken(token({ sub: "user-1", email: "owner@example.com" })),
      /invalid access token/i,
    );
  });
});

describe("sessionFieldsFromTokens", () => {
  it("builds the session fields from a token pair", () => {
    const access = token({ sub: "user-1", email: "owner@example.com", role: "owner", exp: 2_000_000_000 });
    assert.deepEqual(sessionFieldsFromTokens({ access_token: access, refresh_token: "refresh" }), {
      id: "user-1",
      email: "owner@example.com",
      role: "owner",
      accessToken: access,
      refreshToken: "refresh",
      accessTokenExpires: 2_000_000_000_000,
    });
  });
});
