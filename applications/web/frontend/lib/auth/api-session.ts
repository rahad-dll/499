import type { AuthSession, Role, User } from "./types";

const SESSION_KEY = "cp:api-session";

export interface ApiTokens {
  access_token: string;
  refresh_token: string;
}

export interface StoredApiSession extends AuthSession {
  refreshToken: string;
  remember: boolean;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  exp: number;
}

function storageAvailable(): boolean {
  return typeof window !== "undefined";
}

function decodeJwt(token: string): JwtPayload {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) throw new Error("Missing JWT payload");
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Partial<JwtPayload>;
    if (!payload.sub || !payload.email || !payload.role || !payload.exp) {
      throw new Error("Incomplete JWT payload");
    }
    return payload as JwtPayload;
  } catch {
    throw new Error("The API returned an invalid access token");
  }
}

export function sessionFromTokens(
  tokens: ApiTokens,
  remember: boolean,
  existingUser?: User,
  fullName?: string,
): StoredApiSession {
  const payload = decodeJwt(tokens.access_token);
  const user: User = {
    id: payload.sub,
    email: payload.email,
    full_name: fullName?.trim() || existingUser?.full_name || null,
    role: payload.role,
    avatar_url: existingUser?.avatar_url ?? null,
    created_at: existingUser?.created_at ?? new Date().toISOString(),
  };

  return {
    user,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: payload.exp * 1000,
    remember,
  };
}

export function saveApiSession(session: StoredApiSession): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  const storage = session.remember ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readApiSession(): StoredApiSession | null {
  if (!storageAvailable()) return null;
  const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredApiSession;
  } catch {
    clearApiSession();
    return null;
  }
}

export function clearApiSession(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export const _internal = { decodeJwt, SESSION_KEY };
