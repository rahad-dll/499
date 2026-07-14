import { CookieAuthRepository } from "./cookie-repository";
import type { AuthRepository } from "./types";

/**
 * The single place that decides which backend the app talks to.
 *
 * Now: browser cookies + localStorage (no server needed).
 * Later: replace with `new HttpAuthRepository(process.env.NEXT_PUBLIC_API_URL)`
 * — implement the same `AuthRepository` interface and nothing else changes.
 */
export const authRepository: AuthRepository = new CookieAuthRepository();
