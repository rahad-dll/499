"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { TextField } from "@/components/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AuthError, RESET_EMAIL_KEY } from "@/lib/auth/types";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await requestPasswordReset(email);
      try {
        sessionStorage.setItem(RESET_EMAIL_KEY, email.trim().toLowerCase());
      } catch {
        // storage blocked: the reset page asks for the email again
      }
      setSent(true);
      setDevToken(token);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-5 text-center text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] sm:rounded-3xl sm:p-7 dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand shadow-[0_0_0_8px_color-mix(in_srgb,var(--brand)_7%,transparent)]">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Reset your password
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
          Enter the email address associated with your account, and we will email
          you a 6-digit code to reset your password.
        </p>

        {sent && (
          <Alert variant="success" className="mt-4 text-left">
            <CheckCircle2 className="size-5" />
            <AlertTitle>Check your inbox!</AlertTitle>
            <AlertDescription>
              If an account exists for this email, we sent it a 6-digit reset code.{" "}
              <Link
                href={devToken ? `/reset-password?token=${devToken}` : "/reset-password"}
                className="font-semibold underline"
              >
                Enter the code
              </Link>
              {devToken && " (demo: the code is filled in for you)"}
            </AlertDescription>
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
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-4 w-full"
            disabled={submitting}
          >
            {submitting ? "Sending…" : sent ? "Send a new code" : "Send reset code"}
            <ArrowRight className="size-[18px]" />
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3.5 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          or
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted px-4 py-2.5 text-left text-[13px] text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" />
          For your security, the code expires in 15 minutes. You can ask for a new one after a minute.
        </div>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-2 text-brand hover:underline"
        >
          <ArrowLeft className="size-[17px]" />
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
