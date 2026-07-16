"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { BrandPanel } from "@/components/BrandPanel";
import { Logo } from "@/components/Logo";
import { TextField } from "@/components/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@/lib/auth/types";

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
      setSent(true);
      setDevToken(token);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

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

      <div className="w-full max-w-[440px] rounded-3xl border border-border bg-card p-9 text-center text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
        <span className="mx-auto flex size-[76px] items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand shadow-[0_0_0_12px_color-mix(in_srgb,var(--brand)_7%,transparent)]">
          <Lock className="size-[30px]" />
        </span>
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Enter the email address associated with your account, and we will send
          you a secure link to reset your password.
        </p>

        {sent && (
          <Alert variant="success" className="mt-5 text-left">
            <CheckCircle2 className="size-5" />
            <AlertTitle>Check your inbox!</AlertTitle>
            <AlertDescription>
              A reset link has been sent to your email address.
              {devToken && (
                <>
                  {" "}
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="font-semibold underline"
                  >
                    Open reset link
                  </Link>{" "}
                  (demo — normally emailed).
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-5 text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate className="text-left">
          <TextField
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="mt-5 w-full"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send Reset Link"}
            <ArrowRight className="size-[18px]" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3.5 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          or
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted px-4 py-3 text-left text-[13.5px] text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" />
          For your security, the link will expire in 15 minutes.
        </div>

        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 text-brand hover:underline"
        >
          <ArrowLeft className="size-[17px]" />
          Back to Log In
        </Link>
      </div>
    </AuthShell>
  );
}
