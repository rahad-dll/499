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
import { authRepository } from "@/lib/auth/repository";
import { profileRepository } from "@/lib/profiles/repository";
import type {
  LoginInput,
  SignupInput,
  User,
} from "@/lib/auth/types";

interface AuthContextValue {
  user: User | null;
  /** true until the initial session read from the cookie completes */
  loading: boolean;
  signup: (input: SignupInput) => Promise<User>;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ token: string | null }>;
  resetPassword: (token: string, password: string) => Promise<void>;
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

  // Login tokens carry no display name, so fill it from GET /profiles/me once.
  const missingName = !!user && !user.full_name;
  useEffect(() => {
    if (!missingName) return;
    let active = true;
    profileRepository
      .getMyProfile()
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

  const signup = useCallback(async (input: SignupInput) => {
    const session = await authRepository.signup(input);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authRepository.login(input);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authRepository.logout();
    } catch {
      // Local session removal is authoritative even if the API is unavailable.
    }
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => authRepository.requestPasswordReset(email),
    [],
  );

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      await authRepository.resetPassword(token, password);
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
