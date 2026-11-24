"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import {
  isPasswordValid,
  PasswordChecklistField,
} from "@/components/PasswordChecklistField";
import { PasswordField, TextField } from "@/components/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AuthError, RESET_EMAIL_KEY } from "@/lib/auth/types";

const noSubscription = () => () => {};

/** The email the forgot-password page left in sessionStorage, so it isn't typed twice. */
function savedResetEmail(): string {
  try {
    return sessionStorage.getItem(RESET_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function ResetPasswordForm() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const linkToken = useSearchParams().get("token") ?? "";
  const savedEmail = useSyncExternalStore(noSubscription, savedResetEmail, () => "");
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? savedEmail;
  const [token, setToken] = useState(linkToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = isPasswordValid(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = passwordValid && matches && !!email.trim() && !!token.trim() && !done && !submitting;


  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError("Password does not meet all the requirements below.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ email, token, password });
      try {
        sessionStorage.removeItem(RESET_EMAIL_KEY);
      } catch {
        // nothing to clean up
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Reset failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-5 text-center text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] sm:rounded-3xl sm:p-7 dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand shadow-[0_0_0_8px_color-mix(in_srgb,var(--brand)_7%,transparent)]">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-[28px]">
        Choose a new password
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
        Enter the 6-digit code we emailed you and choose a new password.
      </p>

      {done && (
        <Alert variant="success" className="mt-4 text-left">
          <CheckCircle2 className="size-5" />
          <AlertTitle>Password updated!</AlertTitle>
          <AlertDescription>Redirecting you to the login page…</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4 py-2 text-left">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="text-left">
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
        <TextField
          label="Reset code"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          icon={KeyRound}
          compact
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <PasswordChecklistField
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          compact
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordField
          label="Confirm new password"
          name="confirm_password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          icon={Lock}
          compact
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          valid={matches}
          error={confirm.length > 0 && !matches ? "Doesn't match" : undefined}
          required
        />
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="mt-4 w-full"
          disabled={!canSubmit}
        >
          {submitting ? "Saving…" : "Reset password"}
          <ArrowRight className="size-[18px]" />
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 inline-flex items-center gap-2 text-brand hover:underline"
      >
        <ArrowLeft className="size-[17px]" />
        Back to sign in
      </Link>
      <Link href="/forgot-password" className="ml-4 mt-4 inline-flex text-sm text-muted-foreground hover:underline">
        Need a new code?
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
