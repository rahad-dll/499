"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearQueries, fetchQuery } from "@/lib/api/query-store";
import { authRepository } from "@/lib/auth/repository";
import { PROFILE_KEY, profileRepository } from "@/lib/profiles/repository";
import type {
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  User,
} from "@/lib/auth/types";


interface AuthContextValue {
  user: User | null;
  /** true until the initial session read completes */
  loading: boolean;
  signup: (input: SignupInput) => Promise<User>;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ token: string | null }>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  /** re-read the session from storage */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = await authRepository.getSession();
    setUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    authRepository
      .getSession()
      .then((session) => {
        if (active) setUser(session?.user ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Login tokens carry no display name, so fill it from GET /profiles/me once
  // (through the query store, so the profile page reuses the same request).
  const missingName = !!user && !user.full_name;
  useEffect(() => {
    if (!missingName) return;
    let active = true;
    fetchQuery(PROFILE_KEY, () => profileRepository.getMyProfile())
      .then((profile) => {
        if (!active || !profile.user.full_name) return;
        setUser((prev) => (prev ? { ...prev, full_name: profile.user.full_name } : prev));
      })
      .catch(() => {
        // the header falls back to the role name
      });
    return () => {
      active = false;
    };
  }, [missingName]);

  // Cached API data belongs to one account: drop it whenever the account changes.
  const signup = useCallback(async (input: SignupInput) => {
    const session = await authRepository.signup(input);
    clearQueries();
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authRepository.login(input);
    clearQueries();
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    // Wait for the session cookie to go before the UI reacts: a portal shell
    // sends a signed-out user to /login, and proxy.ts would send a browser
    // that still has the cookie straight back. The repository does not wait
    // for the API, so a slow or asleep API never blocks sign-out.
    await authRepository.logout().catch(() => {
      // the UI signs out even if the request failed
    });
    clearQueries();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => authRepository.requestPasswordReset(email),
    [],
  );

  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      await authRepository.resetPassword(input);
      clearQueries();
      setUser(null);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signup,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
      refresh,
    }),
    [user, loading, signup, login, logout, requestPasswordReset, resetPassword, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
