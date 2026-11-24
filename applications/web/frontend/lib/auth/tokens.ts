import type { Role } from "./types";

/** What POST /auth/login and POST /auth/refresh return. */
export interface ApiTokens {
  access_token: string;
  refresh_token: string;
}

/** The claims of a CityPulse access token that the web app reads. */
export interface AccessTokenClaims {
  /** user id */
  sub: string;
  email: string;
  role: Role;
  /** expiry, epoch seconds */
  exp: number;
}

/**
 * Reads the claims of an access token without verifying its signature (only
 * the API holds the key). Call it on tokens that came straight from the API.
 */
export function decodeAccessToken(token: string): AccessTokenClaims {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) throw new Error("Missing JWT payload");
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Partial<AccessTokenClaims>;
    if (!payload.sub || !payload.email || !payload.role || !payload.exp) {
      throw new Error("Incomplete JWT payload");
    }
    return payload as AccessTokenClaims;
  } catch {
    throw new Error("The API returned an invalid access token");
  }
}

/** The session fields NextAuth keeps for a pair of API tokens. */
export function sessionFieldsFromTokens(tokens: ApiTokens) {
  const claims = decodeAccessToken(tokens.access_token);
  return {
    id: claims.sub,
    email: claims.email,
    role: claims.role,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    /** epoch ms */
    accessTokenExpires: claims.exp * 1000,
  };
}
