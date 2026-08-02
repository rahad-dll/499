"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { BrandPanel } from "@/components/BrandPanel";
import { Logo } from "@/components/Logo";
import {
  isPasswordValid,
  PasswordChecklistField,
} from "@/components/PasswordChecklistField";
import { PasswordField } from "@/components/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@/lib/auth/types";

function ResetPasswordForm() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = isPasswordValid(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = passwordValid && matches && !!token && !done && !submitting;

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
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Reset failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] rounded-3xl border border-border bg-card p-9 text-center text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
      <span className="mx-auto flex size-[76px] items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand shadow-[0_0_0_12px_color-mix(in_srgb,var(--brand)_7%,transparent)]">
        <Lock className="size-[30px]" />
      </span>
      <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
        Choose a New Password
      </h2>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Set a new password for your CityPulse account.
      </p>

      {done && (
        <Alert variant="success" className="mt-5 text-left">
          <CheckCircle2 className="size-5" />
          <AlertTitle>Password updated!</AlertTitle>
          <AlertDescription>Redirecting you to the login page…</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mt-5 text-left">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!token && !done && (
        <Alert variant="destructive" className="mt-5 text-left">
          <AlertDescription>
            This reset link is missing its token. Please use the link from the
            forgot-password page, or request a new one.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="text-left">
        <PasswordChecklistField
          label="New Password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordField
          label="Confirm New Password"
          name="confirm_password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          icon={Lock}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          valid={matches}
          error={confirm.length > 0 && !matches ? "Passwords do not match" : undefined}
          required
        />
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="mt-5 w-full"
          disabled={!canSubmit}
        >
          {submitting ? "Saving…" : "Reset Password"}
          <ArrowRight className="size-[18px]" />
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-2 text-brand hover:underline"
      >
        <ArrowLeft className="size-[17px]" />
        Back to Log In
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      brand={
        <BrandPanel
          heading={
            <>
              Smart cities start with
              <br />
              <span className="bg-gradient-to-r from-[#18d6c0] to-[#8b6cff] bg-clip-text text-transparent">
                intelligence.
              </span>
            </>
          }
          sub="CityPulse helps you manage parking, monitor traffic, and build smarter, safer cities."
        />
      }
    >
      <div className="mb-6 flex flex-col items-center lg:hidden">
        <Logo tagline={false} />
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
