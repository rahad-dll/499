import Cookies from "js-cookie";
import {
  AuthError,
  type AuthRepository,
  type AuthSession,
  type LoginInput,
  type Role,
  type SignupInput,
  type User,
} from "./types";

/**
 * Client-only auth backend.
 *  - the current session lives in a cookie (`cp_session`) — mirrors how a real
 *    backend would set an auth cookie, so the swap later is clean.
 *  - the "users table" + reset tokens live in localStorage (cookies are ~4KB
 *    and can't hold many users).
 *
 * Passwords are SHA-256 hashed. This is a front-end prototype store, NOT real
 * security — a real backend must hash server-side (bcrypt) as ours already does.
 */

const SESSION_COOKIE = "cp_session";
const USERS_KEY = "cp:users";
const RESET_KEY = "cp:resets";

const SESSION_TTL_DAYS = 7;
const REMEMBER_TTL_DAYS = 30;
const RESET_TTL_MS = 15 * 60 * 1000;

interface StoredUser extends User {
  password_hash: string;
}

interface SessionCookie {
  t: string; // token
  u: string; // userId
  e: number; // expiresAt (epoch ms)
}

interface ResetEntry {
  userId: string;
  expiresAt: number;
}

/* ---------- low-level storage helpers ---------- */

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readResets(): Record<string, ResetEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RESET_KEY) ?? "{}") as Record<
      string,
      ResetEntry
    >;
  } catch {
    return {};
  }
}

function writeResets(resets: Record<string, ResetEntry>): void {
  localStorage.setItem(RESET_KEY, JSON.stringify(resets));
}

/* ---------- crypto / ids ---------- */

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`citypulse:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function publicUser(u: StoredUser): User {
  const { password_hash: _drop, ...rest } = u;
  void _drop;
  return rest;
}

/* ---------- session cookie ---------- */

function setSessionCookie(user: User, remember: boolean): AuthSession {
  const days = remember ? REMEMBER_TTL_DAYS : SESSION_TTL_DAYS;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  const token = `cp_${randomId()}.${randomId()}`;
  const payload: SessionCookie = { t: token, u: user.id, e: expiresAt };
  Cookies.set(SESSION_COOKIE, JSON.stringify(payload), {
    expires: days,
    sameSite: "lax",
    path: "/",
  });
  return { user, token, expiresAt };
}

/* ---------- the repository ---------- */

export class CookieAuthRepository implements AuthRepository {
  async signup(input: SignupInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const users = readUsers();

    if (users.some((u) => u.email === email)) {
      throw new AuthError(
        "An account with this email already exists",
        "email_taken",
      );
    }

    const now = new Date().toISOString();
    const stored: StoredUser = {
      id: randomId(),
      email,
      full_name: input.full_name.trim() || null,
      role: input.role,
      avatar_url: null,
      created_at: now,
      password_hash: await hashPassword(input.password),
    };
    users.push(stored);
    writeUsers(users);

    return setSessionCookie(publicUser(stored), false);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const user = readUsers().find((u) => u.email === email);
    if (!user) {
      throw new AuthError("Invalid email or password", "invalid_credentials");
    }
    const hash = await hashPassword(input.password);
    if (hash !== user.password_hash) {
      throw new AuthError("Invalid email or password", "invalid_credentials");
    }
    return setSessionCookie(publicUser(user), input.remember ?? false);
  }

  async logout(): Promise<void> {
    Cookies.remove(SESSION_COOKIE, { path: "/" });
  }

  async getSession(): Promise<AuthSession | null> {
    const raw = Cookies.get(SESSION_COOKIE);
    if (!raw) return null;
    let payload: SessionCookie;
    try {
      payload = JSON.parse(raw) as SessionCookie;
    } catch {
      return null;
    }
    if (!payload?.u || payload.e < Date.now()) {
      Cookies.remove(SESSION_COOKIE, { path: "/" });
      return null;
    }
    const user = readUsers().find((u) => u.id === payload.u);
    if (!user) {
      Cookies.remove(SESSION_COOKIE, { path: "/" });
      return null;
    }
    return { user: publicUser(user), token: payload.t, expiresAt: payload.e };
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.token ?? null;
  }

  updateCachedUser(user: User): void {
    const users = readUsers();
    const index = users.findIndex((candidate) => candidate.id === user.id);
    if (index < 0) return;
    users[index] = { ...users[index], ...user };
    writeUsers(users);
  }

  async requestPasswordReset(email: string): Promise<{ token: string | null }> {
    const normalized = email.trim().toLowerCase();
    const user = readUsers().find((u) => u.email === normalized);
    // Always resolve the same way so the endpoint can't probe emails.
    if (!user) return { token: null };

    const token = `rst_${randomId()}`;
    const resets = readResets();
    resets[token] = { userId: user.id, expiresAt: Date.now() + RESET_TTL_MS };
    writeResets(resets);
    return { token };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const resets = readResets();
    const entry = resets[token];
    if (!entry || entry.expiresAt < Date.now()) {
      throw new AuthError(
        "Reset link is invalid or has expired",
        "invalid_token",
      );
    }
    const users = readUsers();
    const user = users.find((u) => u.id === entry.userId);
    if (!user) {
      throw new AuthError(
        "Reset link is invalid or has expired",
        "invalid_token",
      );
    }
    user.password_hash = await hashPassword(password);
    writeUsers(users);

    // consume the token + drop any active session (force re-login)
    delete resets[token];
    writeResets(resets);
    Cookies.remove(SESSION_COOKIE, { path: "/" });
  }
}

export const _internal = { hashPassword, USERS_KEY, SESSION_COOKIE };
export type { Role };
