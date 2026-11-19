import { CookieAuthRepository } from "./cookie-repository";
import { NextAuthRepository } from "./nextauth-repository";
import type { AuthRepository } from "./types";

/**
 * Factory: builds the auth backend named by `NEXT_PUBLIC_AUTH_BACKEND`.
 *
 * - `api` (default): NextAuth sessions backed by the live NestJS API.
 * - `local`: the browser-only prototype store. Sign-up and sign-in work with
 *   no server (useful for UI demos while the API is asleep), but portal data
 *   still comes from the API and needs the real backend.
 */
export function createAuthRepository(
  backend = process.env.NEXT_PUBLIC_AUTH_BACKEND,
): AuthRepository {
  return backend === "local" ? new CookieAuthRepository() : new NextAuthRepository();
}

/**
 * Singleton: the one auth backend the whole app shares, so every request
 * sees the same session and the same in-progress token refresh.
 */
export const authRepository: AuthRepository = createAuthRepository();
