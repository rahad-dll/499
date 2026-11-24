import type { Role } from "@/lib/auth/types";

/** Why a NextAuth session can no longer be used. */
type SessionError = "RefreshRejected" | "SessionExpired";

declare module "next-auth" {
  /** What the browser gets from /api/auth/session. The refresh token never leaves the server. */
  interface Session {
    user: { id: string; email: string; role: Role };
    /** Bearer token for the CityPulse API */
    accessToken: string;
    /** epoch ms */
    accessTokenExpires: number;
    remember: boolean;
    /** set when the session is over and the user must sign in again */
    error?: SessionError;
  }

  /** What `authorize` returns after a successful POST /auth/login. */
  interface User {
    id: string;
    email: string;
    role: Role;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    remember: boolean;
  }
}

declare module "next-auth/jwt" {
  /** The encrypted session cookie. */
  interface JWT {
    role: Role;
    accessToken: string;
    refreshToken: string;
    /** epoch ms */
    accessTokenExpires: number;
    remember: boolean;
    /** epoch ms of the sign-in */
    signedInAt: number;
    error?: SessionError;
  }
}
