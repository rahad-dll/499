"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { PasswordField, TextField } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { postLoginDestination } from "@/lib/auth/access";
import { AuthError } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Whoever is signed in leaves this page: right after the form succeeds, or
  // on arrival with a live session. `?next=` is the portal page proxy.ts sent
  // the visitor here from; they return to it when their role may open it.
  useEffect(() => {
    if (loading || !user) return;
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(postLoginDestination(next, user.role));
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, remember });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-5 text-center text-[var(--panel-fg)] sm:mb-6 [@media(max-height:760px)]:mb-4">
        <div className="text-[12px] font-bold uppercase tracking-[0.35em] text-teal-600 dark:text-brand [@media(max-height:700px)]:hidden">
          Welcome back
        </div>
        <h1 className="mt-2 text-[clamp(26px,3vw,36px)] font-extrabold leading-[1.15] tracking-tight">
          Welcome back to City<span className="text-logo-pulse">Pulse</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[420px] text-sm leading-5 text-[var(--panel-muted)] sm:text-[15px] [@media(max-height:760px)]:hidden">
          Sign in to continue managing your city with intelligence and precision.
        </p>
      </div>

      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] sm:rounded-3xl sm:p-7 xl:p-8 2xl:max-w-[480px] [@media(max-height:760px)]:p-5">
        <span className="flex size-10 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand sm:size-11">
          <Activity className="size-[22px]" />
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[28px]">Sign in</h2>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-1.5 sm:text-[15px]">
          Enter your email and password to continue.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-4 py-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={Mail}
            compact
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            icon={Lock}
            compact
            labelEnd={
              <Link href="/forgot-password" className="text-brand hover:underline">
                Forgot password?
              </Link>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Label className="mt-3.5 cursor-pointer font-normal text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
            Remember me
          </Label>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-4 w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
            <ArrowRight className="size-[18px]" />
          </Button>
        </form>

        <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create account
          </Link>
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 px-3 text-center text-[11px] text-muted-foreground sm:mt-5 sm:text-[13px] [@media(max-height:700px)]:mt-2">
        <ShieldCheck className="size-4" />
        Secured with JWT sessions and rotating refresh tokens.
      </div>
    </AuthShell>
  );
}
