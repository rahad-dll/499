/**
 * Auth domain types + the repository contract.
 *
 * Everything the UI touches goes through `AuthRepository`. The active
 * implementation calls the deployed NestJS API and persists its JWT session.
 */

export type Role = "driver" | "owner" | "authority";

export const ROLES: Role[] = ["driver", "owner", "authority"];

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthSession {
  user: User;
  /** opaque access token (mirrors a real backend token) */
  token: string;
  /** epoch ms */
  expiresAt: number;
}

export interface SignupInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code:
      | "email_taken"
      | "invalid_credentials"
      | "inactive"
      | "invalid_token"
      | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthRepository {
  signup(input: SignupInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  logout(): Promise<void>;
  /** current session from storage, or null */
  getSession(): Promise<AuthSession | null>;
  /** a current access token, refreshing it when necessary */
  getAccessToken(): Promise<string | null>;
  /** replace the public user snapshot stored with the active session */
  updateCachedUser(user: User): void;
  /** returns a reset token (in a real backend this is emailed, not returned) */
  requestPasswordReset(email: string): Promise<{ token: string | null }>;
  resetPassword(token: string, password: string): Promise<void>;
}
