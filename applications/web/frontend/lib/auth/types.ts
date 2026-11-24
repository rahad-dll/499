/**
 * Auth domain types + the repository contract.
 *
 * Everything the UI touches goes through `AuthRepository`. The active
 * implementation calls the deployed NestJS API and persists its JWT session.
 */

/** `admin` accounts are created by the CityPulse team; nobody can sign up as one. */
export type Role = "driver" | "owner" | "authority" | "admin";

/** The roles a visitor can choose on the signup page. */
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
  /** true when the user ticked "Remember me" (the session outlives the browser) */
  remember?: boolean;
}

export interface SignupInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

/** sessionStorage key that hands the email from /forgot-password to /reset-password (kept out of the URL). */
export const RESET_EMAIL_KEY = "cp:reset-email";

export interface ResetPasswordInput {
  email: string;
  /** the 6-digit code from the reset email */
  token: string;
  password: string;
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
  /** resolves once this browser is signed out; revoking on the API is not waited for */
  logout(): Promise<void>;
  /** current session from storage, or null */
  getSession(): Promise<AuthSession | null>;
  /** a current access token, refreshing it when necessary */
  getAccessToken(): Promise<string | null>;
  /** replace the public user snapshot stored with the active session */
  updateCachedUser(user: User): void;
  /**
   * Asks for a password reset. The API emails a 6-digit code and returns no
   * token; the browser-only prototype returns its token so the demo can go on.
   */
  requestPasswordReset(email: string): Promise<{ token: string | null }>;
  /** Sets a new password with the emailed code (`token`). */
  resetPassword(input: ResetPasswordInput): Promise<void>;
}
