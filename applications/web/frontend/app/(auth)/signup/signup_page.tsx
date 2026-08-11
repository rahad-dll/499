"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Car,
  Lock,
  Mail,
  ParkingCircle,
  Phone,
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
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/auth/phone";
import { roleDestination } from "@/lib/auth/destination";
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
  {
    value: "driver",
    name: "Driver",
    desc: "Find, book, and navigate to parking.",
    icon: Car,
    tint: "#0d9488",
    bg: "rgba(20,211,178,0.14)",
  },
  {
    value: "owner",
    name: "Parking Owner",
    desc: "Register spaces and manage CCTV feeds.",
    icon: ParkingCircle,
    tint: "#7c3aed",
    bg: "rgba(139,108,255,0.14)",
  },
  {
    value: "authority",
    name: "Traffic Authority",
    desc: "Monitor city-wide congestion heatmaps.",
    icon: ShieldCheck,
    tint: "#0284c7",
    bg: "rgba(56,189,248,0.14)",
  },
];

type SignupStep = 1 | 2;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<SignupStep>(1);
  const [role, setRole] = useState<Role>("driver");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stepHeadingRef = useRef<HTMLDivElement>(null);
  const didChangeStep = useRef(false);

  const passwordValid = isPasswordValid(password);
  const matches = confirm.length > 0 && confirm === password;
  const normalizedPhone = normalizeBangladeshPhone(phone);
  const phoneValid = isValidBangladeshPhone(phone);
  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    phoneValid &&
    passwordValid &&
    matches &&
    !submitting;
  const selectedRole = ROLES.find((item) => item.value === role) ?? ROLES[0];

  useEffect(() => {
    if (!didChangeStep.current) return;

    stepHeadingRef.current?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [step]);

  function goToStep(nextStep: SignupStep) {
    didChangeStep.current = true;
    setError(null);
    setStep(nextStep);
  }

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
    if (!phoneValid) {
      setError("Enter a valid 11-digit Bangladeshi mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await signup({
        full_name: fullName,
        email,
        phone: normalizedPhone,
        password,
        role,
      });
      router.replace(roleDestination(user.role, "signup"));
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Signup failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <nav className="flex items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-4">
        <Logo taglineClassName="hidden sm:inline" />
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground sm:gap-4">
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

      <main className="flex flex-1 items-start justify-center px-3 pb-4 sm:px-6 sm:pb-8 lg:items-center lg:px-8 lg:py-4 xl:py-6">
        <div className="w-full max-w-[1000px] rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] sm:rounded-3xl sm:p-7 lg:p-8 xl:p-10 dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
          <div className="text-center">
            <span
              className={cn(
                "size-10 items-center justify-center rounded-xl border-2 border-brand bg-brand/10 text-brand sm:size-12",
                step === 1 ? "inline-flex" : "hidden sm:inline-flex",
              )}
            >
              <UserPlus className="size-[22px]" />
            </span>
            <h1
              className={cn(
                "text-2xl font-extrabold tracking-tight sm:text-[30px] xl:text-[34px]",
                step === 1 ? "mt-3 sm:mt-4" : "mt-0 sm:mt-3",
              )}
            >
              Create Your CityPulse Account
            </h1>
            <p
              className={cn(
                "mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-[15px]",
                step === 2 && "hidden sm:block",
              )}
            >
              Join our intelligent platform and be part of a smarter, smoother
              city.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4 sm:mt-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate>
            {step === 1 ? (
              <>
                <div
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-5 flex items-start gap-3 outline-none sm:mt-7 sm:gap-3.5"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                    1
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold">
                      Choose Your Role
                    </span>
                    <span className="block text-[13.5px] text-muted-foreground">
                      Select how you&apos;ll be using CityPulse
                    </span>
                  </span>
                  <span className="ml-auto whitespace-nowrap pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Step 1 of 2
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Choose your role"
                  className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mt-5 md:gap-4"
                >
                  {ROLES.map((roleOption) => {
                    const active = role === roleOption.value;
                    return (
                      <button
                        key={roleOption.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRole(roleOption.value)}
                        className={cn(
                          "relative grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border-[1.5px] p-3.5 text-left transition-all sm:block sm:p-4 lg:rounded-2xl lg:p-5",
                          active
                            ? "border-brand bg-brand/5 ring-[3px] ring-brand/15"
                            : "border-border hover:border-brand/55",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute right-3.5 top-3.5 flex size-5 items-center justify-center rounded-full border-2 sm:right-3 sm:top-3 lg:right-4 lg:top-4",
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
                          className="row-span-2 flex size-10 items-center justify-center rounded-xl sm:size-11"
                          style={{
                            background: roleOption.bg,
                            color: roleOption.tint,
                          }}
                        >
                          <roleOption.icon className="size-[22px]" />
                        </span>
                        <span className="block pr-7 text-base font-extrabold sm:mt-3 sm:text-[15px] lg:mt-3.5 lg:text-[17px]">
                          {roleOption.name}
                        </span>
                        <span className="mt-0.5 block pr-5 text-[13px] leading-5 text-muted-foreground sm:mt-1.5 sm:pr-0 lg:mt-2 lg:text-[13.5px]">
                          {roleOption.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex justify-end sm:mt-6">
                  <Button
                    type="button"
                    variant="brand"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-52"
                    onClick={() => goToStep(2)}
                  >
                    Continue
                    <ArrowRight className="size-[18px]" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-2 outline-none sm:mt-7 sm:gap-x-3.5"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                    2
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold">
                      Account Details
                    </span>
                    <span className="block text-[13.5px] text-muted-foreground">
                      Enter your information to get started
                    </span>
                  </span>
                  <span className="ml-auto flex items-center gap-2 pl-[42px] sm:pl-0">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold"
                      style={{ color: selectedRole.tint }}
                    >
                      <selectedRole.icon className="size-3.5" />
                      {selectedRole.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Change
                    </button>
                  </span>
                </div>

                <div>
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

                  <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
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
                    <TextField
                      label="Mobile Number"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01712345678"
                      icon={Phone}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={(event) => {
                        const nextPhone = normalizeBangladeshPhone(
                          event.currentTarget.value,
                        );
                        if (isValidBangladeshPhone(nextPhone)) {
                          setPhone(nextPhone);
                        }
                      }}
                      error={
                        phone.length > 0 && !phoneValid
                          ? "Use a valid BD mobile number starting 013-019"
                          : undefined
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
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
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="sm:min-w-32"
                    onClick={() => goToStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#38a9f0] to-[#14d3a8] text-white shadow-[0_12px_28px_-10px_rgba(56,169,240,0.5)] hover:brightness-110 sm:w-auto sm:flex-1 sm:shrink"
                    disabled={!canSubmit}
                  >
                    {submitting ? "Creating Account..." : "Create Account"}
                    <ArrowRight className="size-[18px]" />
                  </Button>
                </div>
              </>
            )}
          </form>

          {step === 2 && (
            <div className="mt-2 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground sm:mt-5 sm:items-center sm:text-[13.5px]">
              <Lock className="mt-0.5 size-3.5 shrink-0 sm:mt-0" />
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
          )}
        </div>
      </main>
    </div>
  );
}
