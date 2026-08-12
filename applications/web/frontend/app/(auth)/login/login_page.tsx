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
import { roleDestination } from "@/lib/auth/destination";
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
      const user = await login({ email, password, remember });
      router.replace(roleDestination(user.role, "login"));
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
      <div className="mb-4 flex flex-col items-center text-center sm:mb-5 lg:hidden">
        <Logo tagline taglineClassName="mt-1" />
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-emerald-500 shadow-sm">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-current motion-reduce:animate-none" />
          All city systems operational
        </span>
      </div>

      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] sm:rounded-3xl sm:p-7 xl:p-8 2xl:max-w-[500px] 2xl:p-10 [@media(max-height:760px)]:p-5">
        <span className="flex size-10 items-center justify-center rounded-full border-2 border-brand bg-brand/10 text-brand sm:size-12">
          <Activity className="size-[22px]" />
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:mt-4 sm:text-3xl">Log In</h2>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-1.5 sm:text-[15px]">
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

          <Label className="mt-4 cursor-pointer font-normal text-muted-foreground sm:mt-[18px]">
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
            className="mt-4 w-full sm:mt-5"
            disabled={submitting}
          >
            {submitting ? "Logging in…" : "Log In"}
            <ArrowRight className="size-[18px]" />
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border sm:my-5 sm:gap-3.5">
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

        <p className="mt-4 text-center text-sm text-muted-foreground sm:mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Sign Up
          </Link>
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 px-3 text-center text-[11px] text-muted-foreground sm:mt-5 sm:text-[13px] [@media(max-height:700px)]:mt-2">
        <ShieldCheck className="size-4" />
        Your data is protected with enterprise-grade security.
      </div>
    </AuthShell>
  );
}
