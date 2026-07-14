"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Car,
  Lock,
  Mail,
  ParkingCircle,
  ShieldCheck,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  isPasswordValid,
  PasswordChecklistField,
} from "@/components/PasswordChecklistField";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordField, TextField } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { AuthError, type Role } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const ROLES: {
  value: Role;
  name: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
  bg: string;
}[] = [
  { value: "driver", name: "Driver", desc: "Find, book, and navigate to parking.", icon: Car, tint: "#0d9488", bg: "rgba(20,211,178,0.14)" },
  { value: "owner", name: "Parking Owner", desc: "Register spaces and manage CCTV feeds.", icon: ParkingCircle, tint: "#7c3aed", bg: "rgba(139,108,255,0.14)" },
  { value: "authority", name: "Traffic Authority", desc: "Monitor city-wide congestion heatmaps.", icon: ShieldCheck, tint: "#0284c7", bg: "rgba(56,189,248,0.14)" },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [role, setRole] = useState<Role>("driver");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = isPasswordValid(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordValid &&
    matches &&
    !submitting;

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
      await signup({ full_name: fullName, email, password, role });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Signup failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Already have an account?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-brand hover:underline"
          >
            Log In <ArrowRight className="size-[15px]" />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex flex-1 justify-center px-4 pb-16 sm:px-8">
        <div className="w-full max-w-[1000px] rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)] sm:p-14">
          <div className="text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-xl border-2 border-brand bg-brand/10 text-brand">
              <UserPlus className="size-[22px]" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-[34px]">
              Create Your CityPulse Account
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Join our intelligent platform and be part of a smarter, smoother
              city.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="mt-10 flex items-start gap-3.5">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                1
              </span>
              <span>
                <div className="text-lg font-extrabold">Choose Your Role</div>
                <div className="text-[13.5px] text-muted-foreground">
                  Select how you&apos;ll be using CityPulse
                </div>
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Choose your role"
              className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "relative rounded-2xl border-[1.5px] p-5 text-left transition-all",
                      active
                        ? "border-brand bg-brand/5 ring-[3px] ring-brand/15"
                        : "border-border hover:border-brand/55",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border-2",
                        active ? "border-brand" : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2.5 rounded-full bg-brand transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </span>
                    <span
                      className="flex size-11 items-center justify-center rounded-xl"
                      style={{ background: r.bg, color: r.tint }}
                    >
                      <r.icon className="size-[22px]" />
                    </span>
                    <div className="mt-3.5 text-[17px] font-extrabold">{r.name}</div>
                    <div className="mt-2 text-[13.5px] text-muted-foreground">
                      {r.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-start gap-3.5">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                2
              </span>
              <span>
                <div className="text-lg font-extrabold">Account Details</div>
                <div className="text-[13.5px] text-muted-foreground">
                  Enter your information to get started
                </div>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
              <TextField
                label="Full Name"
                name="full_name"
                autoComplete="name"
                placeholder="Enter your full name"
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <TextField
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordChecklistField
                label="Password"
                name="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordField
                label="Confirm Password"
                name="confirm_password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                icon={Lock}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                valid={matches}
                error={
                  confirm.length > 0 && !matches
                    ? "Passwords do not match"
                    : undefined
                }
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-9 w-full bg-gradient-to-r from-[#38a9f0] to-[#14d3a8] text-white shadow-[0_12px_28px_-10px_rgba(56,169,240,0.5)] hover:brightness-110"
              disabled={!canSubmit}
            >
              {submitting ? "Creating Account…" : "Create Account"}
              <ArrowRight className="size-[18px]" />
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-center text-[13.5px] text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            <span>
              By creating an account, you agree to our{" "}
              <a href="#" className="text-brand hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-brand hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
