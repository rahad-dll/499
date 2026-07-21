"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Activity, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { BrandPanel } from "@/components/BrandPanel";
import { GithubIcon, GoogleIcon } from "@/components/brand-icons";
import { Logo } from "@/components/Logo";
import { PasswordField, TextField } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { AuthError } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, remember });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      brand={
        <BrandPanel
          eyebrow="Welcome back"
          heading={
            <>
              Welcome back to
              <br />
              <span className="text-brand">CityPulse</span>
            </>
          }
          sub="Sign in to continue managing your city with intelligence and precision."
        />
      }
    >
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <Logo tagline={false} />
      </div>

      <div className="w-full max-w-[440px] rounded-3xl border border-border bg-card p-9 text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand">
          <Activity className="size-[22px]" />
        </span>
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight">Log In</h2>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Enter your credentials to access your account
        </p>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
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
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            icon={Lock}
            labelEnd={
              <Link href="/forgot-password" className="text-brand hover:underline">
                Forgot Password?
              </Link>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Label className="mt-[18px] cursor-pointer font-normal text-muted-foreground">
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
            className="mt-5 w-full"
            disabled={submitting}
          >
            {submitting ? "Logging in…" : "Log In"}
            <ArrowRight className="size-[18px]" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3.5 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          Or continue with
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Button variant="outline" size="lg" type="button" title="Coming soon">
            <GoogleIcon /> Google
          </Button>
          <Button variant="outline" size="lg" type="button" title="Coming soon">
            <GithubIcon /> GitHub
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Sign Up
          </Link>
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
        <ShieldCheck className="size-4" />
        Your data is protected with enterprise-grade security.
      </div>
    </AuthShell>
  );
}
