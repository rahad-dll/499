import { ApiError, apiRequest } from "@/lib/api/client";
import {
  clearApiSession,
  readApiSession,
  saveApiSession,
  sessionFromTokens,
  type ApiTokens,
} from "./api-session";
import {
  AuthError,
  type AuthRepository,
  type AuthSession,
  type LoginInput,
  type SignupInput,
} from "./types";

const REFRESH_WINDOW_MS = 30_000;

function authError(error: unknown, fallback: string): AuthError {
  if (!(error instanceof ApiError)) return new AuthError(fallback);
  if (error.status === 401) {
    return new AuthError("Invalid email or password", "invalid_credentials");
  }
  if (error.status === 409) return new AuthError(error.message, "email_taken");
  if (error.status === 403) return new AuthError(error.message, "inactive");
  return new AuthError(error.message);
}

async function requestTokens(input: LoginInput): Promise<ApiTokens> {
  return apiRequest<ApiTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      device_name: typeof navigator === "undefined" ? "CityPulse Web" : navigator.userAgent,
    }),
  });
}

export class HttpAuthRepository implements AuthRepository {
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

      const tokens = await requestTokens(input);
      const session = sessionFromTokens(tokens, false, undefined, input.full_name);
      saveApiSession(session);
      return session;
    } catch (error) {
      throw authError(error, "Signup failed");
    }
  }

  async login(input: LoginInput): Promise<AuthSession> {
    try {
      const tokens = await requestTokens(input);
      const session = sessionFromTokens(tokens, input.remember ?? false);
      saveApiSession(session);
      return session;
    } catch (error) {
      throw authError(error, "Login failed");
    }
  }

  async logout(): Promise<void> {
    const session = readApiSession();
    try {
      if (session?.token) {
        await apiRequest<{ message: string }>("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
        });
      }
    } finally {
      clearApiSession();
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const stored = readApiSession();
    if (!stored) return null;
    if (stored.expiresAt > Date.now() + REFRESH_WINDOW_MS) return stored;

    try {
      const tokens = await apiRequest<ApiTokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: stored.refreshToken }),
      });
      const refreshed = sessionFromTokens(
        tokens,
        stored.remember,
        stored.user,
      );
      saveApiSession(refreshed);
      return refreshed;
    } catch {
      clearApiSession();
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.token ?? null;
  }

  async requestPasswordReset(): Promise<{ token: string | null }> {
    throw new AuthError("Password reset is not available in the current API.");
  }

  async resetPassword(): Promise<void> {
    throw new AuthError("Password reset is not available in the current API.");
  }
}
