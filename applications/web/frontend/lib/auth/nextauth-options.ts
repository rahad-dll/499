import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_URL } from "@/lib/api/client";
import { sessionFieldsFromTokens, type ApiTokens } from "./tokens";

/**
 * NextAuth configuration (server only).
 *
 * NextAuth does not check passwords itself: the Credentials provider forwards
 * them to the CityPulse API (POST /auth/login) and keeps the API's tokens in
 * its encrypted, httpOnly session cookie. The browser only ever receives the
 * short-lived access token (through /api/auth/session); the refresh token
 * stays on the server, which rotates the pair when the access token runs out.
 */

/** A sleeping Render instance can take close to a minute to answer. */
const API_TIMEOUT_MS = 55_000;
/** Refresh this long before the access token expires. */
const REFRESH_WINDOW_MS = 30_000;
/** "Remember me" sessions last this long (seconds). */
const REMEMBERED_SESSION_S = 30 * 24 * 60 * 60;
/** Sessions without "Remember me" end this long after sign-in. */
const SHORT_SESSION_MS = 24 * 60 * 60 * 1000;
/** How long the result of a refresh stays reusable (see `rotateTokens`). */
const REFRESH_REUSE_MS = 60_000;

/** The login failures the sign-in form knows how to explain. */
export type LoginFailure = "invalid_credentials" | "inactive" | "unavailable";

interface ApiReply {
  ok: boolean;
  status: number;
  data: unknown;
}

async function apiPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<ApiReply> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  const data: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

function isTokens(data: unknown): data is ApiTokens {
  const tokens = data as Partial<ApiTokens> | null;
  return typeof tokens?.access_token === "string" && typeof tokens?.refresh_token === "string";
}

function messageOf(data: unknown): string {
  const message = (data as { message?: unknown } | null)?.message;
  return Array.isArray(message) ? message.join(". ") : typeof message === "string" ? message : "";
}

const fail = (reason: LoginFailure) => new Error(reason);

/* ---------- token refresh ---------- */

/**
 * The API rotates refresh tokens: using one twice is rejected, which would end
 * the session. Requests that arrive together (or just after, still carrying
 * the old cookie) therefore share one refresh. `null` means the API rejected
 * the refresh token; a thrown error means the API could not be reached.
 */
const refreshes = new Map<string, Promise<ApiTokens | null>>();

async function requestRefresh(refreshToken: string): Promise<ApiTokens | null> {
  const reply = await apiPost("/auth/refresh", { refresh_token: refreshToken });
  if (reply.ok && isTokens(reply.data)) return reply.data;
  if (reply.status >= 500) throw new Error(`Refresh failed (${reply.status})`);
  return null;
}

function rotateTokens(refreshToken: string): Promise<ApiTokens | null> {
  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = requestRefresh(refreshToken);
    refreshes.set(refreshToken, pending);
    const forget = () => refreshes.delete(refreshToken);
    pending.then(
      () => setTimeout(forget, REFRESH_REUSE_MS),
      forget, // unreachable API: let the next request try again
    );
  }
  return pending;
}

/** Ends the session: the browser signs out when it sees `error`. */
function ended(token: JWT, error: NonNullable<JWT["error"]>): JWT {
  return { ...token, accessToken: "", refreshToken: "", error };
}

async function refreshed(token: JWT): Promise<JWT> {
  try {
    const tokens = await rotateTokens(token.refreshToken);
    if (!tokens) return ended(token, "RefreshRejected");
    const { accessToken, refreshToken, accessTokenExpires, role } = sessionFieldsFromTokens(tokens);
    return { ...token, role, accessToken, refreshToken, accessTokenExpires };
  } catch {
    // The API is asleep or unreachable: keep the session and try again on the
    // next request instead of signing the user out.
    return token;
  }
}

/* ---------- options ---------- */

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: REMEMBERED_SESSION_S },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    CredentialsProvider({
      name: "CityPulse",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { type: "text" },
        device_name: { type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) throw fail("invalid_credentials");

        let reply: ApiReply;
        try {
          reply = await apiPost("/auth/login", {
            email,
            password,
            device_name: credentials?.device_name || "CityPulse Web",
          });
        } catch {
          throw fail("unavailable");
        }

        if (reply.status === 403) throw fail("inactive");
        if (reply.status >= 400 && reply.status < 500) {
          // 401 is a wrong email or password, or a disabled account (with its
          // own message); 400 is input the API refuses to check, e.g. a
          // password shorter than 8 characters, so it can't be right either
          throw fail(/disabled/i.test(messageOf(reply.data)) ? "inactive" : "invalid_credentials");
        }
        // only 5xx or a malformed reply means the API itself is in trouble
        if (!reply.ok || !isTokens(reply.data)) throw fail("unavailable");

        return {
          ...sessionFieldsFromTokens(reply.data),
          remember: credentials?.remember === "true",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // sign-in: `user` is what `authorize` returned
      if (user) {
        return {
          sub: user.id,
          email: user.email,
          role: user.role,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: user.accessTokenExpires,
          remember: user.remember,
          signedInAt: Date.now(),
        };
      }
      if (token.error) return token;
      if (!token.remember && Date.now() > token.signedInAt + SHORT_SESSION_MS) {
        return ended(token, "SessionExpired");
      }
      if (Date.now() < token.accessTokenExpires - REFRESH_WINDOW_MS) return token;
      return refreshed(token);
    },

    session({ session, token }) {
      session.user = { id: token.sub ?? "", email: token.email ?? "", role: token.role };
      session.accessToken = token.accessToken;
      session.accessTokenExpires = token.accessTokenExpires;
      session.remember = token.remember;
      session.error = token.error;
      return session;
    },
  },
};
