import type { Session } from "next-auth";
import { getSession as fetchNextAuthSession, signIn, signOut } from "next-auth/react";
import { ApiError, apiRequest, trackSlow } from "@/lib/api/client";
import type { LoginFailure } from "./nextauth-options";
import {
  AuthError,
  type AuthRepository,
  type AuthSession,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
  type User,
} from "./types";

/** Ask the server for a fresh session this long before the access token expires. */
const REFRESH_WINDOW_MS = 30_000;
/** Web Lock that keeps tabs from asking for a token refresh at the same time. */
const SESSION_LOCK = "cp:auth-session";
/** Display details (name, avatar) of the signed-in user, kept between page loads. */
const DISPLAY_KEY = "cp:user-display";

type DisplayDetails = Pick<User, "id" | "full_name" | "avatar_url" | "created_at">;

/* The NextAuth session knows id, email and role. The name and avatar come from
   GET /profiles/me; keeping the last known copy avoids a flash of the role
   name in the header on every page load. It holds nothing secret. */

function readDisplay(userId: string): DisplayDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const details = JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? "null") as DisplayDetails | null;
    return details?.id === userId ? details : null;
  } catch {
    return null;
  }
}

function writeDisplay(user: User): void {
  if (typeof window === "undefined") return;
  const details: DisplayDetails = {
    id: user.id,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  };
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(details));
  } catch {
    // storage blocked: the name is fetched again on the next page load
  }
}

function clearDisplay(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DISPLAY_KEY);
  } catch {
    // nothing to clear
  }
}

function toAuthSession(session: Session): AuthSession {
  const known = readDisplay(session.user.id);
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      full_name: known?.full_name ?? null,
      avatar_url: known?.avatar_url ?? null,
      created_at: known?.created_at ?? new Date().toISOString(),
    },
    token: session.accessToken,
    expiresAt: session.accessTokenExpires,
    remember: session.remember,
  };
}

const LOGIN_FAILURES: Record<LoginFailure, AuthError> = {
  invalid_credentials: new AuthError("Invalid email or password", "invalid_credentials"),
  inactive: new AuthError("This account has been disabled. Contact CityPulse support.", "inactive"),
  unavailable: new AuthError("CityPulse could not be reached. Please try again in a moment."),
};

function signupError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (!(error instanceof ApiError)) return new AuthError("Signup failed");
  if (error.status === 409) return new AuthError(error.message, "email_taken");
  return new AuthError(error.message);
}

/**
 * Auth backed by NextAuth (see lib/auth/nextauth-options.ts).
 *
 * The session lives in NextAuth's httpOnly cookie. This class signs in and out
 * through NextAuth, and keeps the current access token in memory so API calls
 * do not ask /api/auth/session every time.
 */
export class NextAuthRepository implements AuthRepository {
  /** the last session read from NextAuth; null until the first read and when signed out */
  private current: AuthSession | null = null;
  /** the session read in progress, shared by everyone who asks meanwhile */
  private loading: Promise<AuthSession | null> | null = null;

  async signup(input: SignupInput): Promise<AuthSession> {
    try {
      await apiRequest<{ message: string; user_id: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: input.full_name.trim(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
          phone: input.phone.trim(),
          role: input.role,
        }),
      });
      const session = await this.signIn(input);
      const user: User = { ...session.user, full_name: input.full_name.trim() };
      this.updateCachedUser(user);
      return { ...session, user };
    } catch (error) {
      throw signupError(error);
    }
  }

  login(input: LoginInput): Promise<AuthSession> {
    return this.signIn(input);
  }

  private async signIn(input: LoginInput): Promise<AuthSession> {
    // slow while the API wakes up: trackSlow shows the "waking up" notice
    const result = await trackSlow(
      signIn("credentials", {
        redirect: false,
        email: input.email.trim().toLowerCase(),
        password: input.password,
        remember: String(input.remember ?? false),
        device_name: typeof navigator === "undefined" ? "CityPulse Web" : navigator.userAgent,
      }),
    );
    if (!result?.ok || result.error) {
      throw LOGIN_FAILURES[result?.error as LoginFailure] ?? new AuthError("Sign-in failed. Please try again.");
    }

    this.current = null;
    const session = await this.getSession();
    if (!session) throw new AuthError("Sign-in failed. Please try again.");
    return session;
  }

  async logout(): Promise<void> {
    const token = this.current?.token;
    this.current = null;
    clearDisplay();
    try {
      // our own server: quick, and the cookie must be gone before /login loads
      await signOut({ redirect: false });
    } finally {
      // Revoking on the API can take a minute while a sleeping Render instance
      // wakes, so nobody waits for it.
      if (token) {
        apiRequest<{ message: string }>("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // the browser is signed out either way
        });
      }
    }
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.current && this.current.expiresAt > Date.now() + REFRESH_WINDOW_MS) return this.current;

    // Every caller in this tab waits on the same read instead of starting its own.
    this.loading ??= this.readOnce().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  /**
   * Reading the session is what makes the server refresh an expired access
   * token, and the API rejects a refresh token that is used twice. A Web Lock
   * makes tabs take turns, so the second tab finds the cookie already renewed.
   */
  private async readOnce(): Promise<AuthSession | null> {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request(SESSION_LOCK, () => this.read());
    }
    return this.read();
  }

  private async read(): Promise<AuthSession | null> {
    const session = await trackSlow(fetchNextAuthSession());
    if (!session?.user) {
      this.current = null;
      return null;
    }
    if (session.error || !session.accessToken) {
      // the server could not renew the session: drop the cookie too, so
      // proxy.ts stops treating this browser as signed in
      this.current = null;
      clearDisplay();
      await signOut({ redirect: false }).catch(() => {});
      return null;
    }
    this.current = toAuthSession(session);
    return this.current;
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.token ?? null;
  }

  updateCachedUser(user: User): void {
    writeDisplay(user);
    if (this.current?.user.id === user.id) this.current = { ...this.current, user };
  }

  /** POST /auth/forgot-password: always 200 (it never reveals whether the email has an account). */
  async requestPasswordReset(email: string): Promise<{ token: string | null }> {
    try {
      await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return { token: null };
    } catch (error) {
      throw new AuthError(error instanceof ApiError ? error.message : "Could not send the reset code");
    }
  }

  /** POST /auth/reset-password: signs every session of the account out on success. */
  async resetPassword({ email, token, password }: ResetPasswordInput): Promise<void> {
    try {
      await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim(), new_password: password }),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        throw new AuthError(error.message || "The code is invalid or has expired.", "invalid_token");
      }
      throw new AuthError(error instanceof ApiError ? error.message : "Could not reset the password");
    }
    // the API has revoked this browser's tokens as well
    this.current = null;
    clearDisplay();
    await signOut({ redirect: false }).catch(() => {});
  }
}
