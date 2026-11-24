"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Car,
  Download,
  Lock,
  Mail,
  ParkingCircle,
  Phone,
  ShieldCheck,
  Smartphone,
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
    name: "Parking owner",
    desc: "Register spaces and manage CCTV feeds.",
    icon: ParkingCircle,
    tint: "#7c3aed",
    bg: "rgba(139,108,255,0.14)",
  },
  {
    value: "authority",
    name: "Traffic authority",
    desc: "Monitor city-wide congestion heatmaps.",
    icon: ShieldCheck,
    tint: "#0284c7",
    bg: "rgba(56,189,248,0.14)",
  },
];

type SignupStep = 1 | 2;

export default function SignupPage({
  initialRole = "driver",
  apkCaption = "Android APK · latest build",
}: {
  initialRole?: Role;
  /** "Android APK · 95.2 MB · Updated 10 Nov 2026", shown under the driver download */
  apkCaption?: string;
}) {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<SignupStep>(1);
  const [role, setRole] = useState<Role>(initialRole);
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
    // drivers create their account in the mobile app
    if (role === "driver") return;
    if (!passwordValid) {
      setError("Password does not meet all the requirements below.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match.");
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
      setError(err instanceof AuthError ? err.message : "Could not create your account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "var(--panel-bg)" }}>
      <nav className="flex items-center justify-between gap-3 px-4 py-2.5 short:py-2 sm:gap-4 sm:px-8 sm:py-3">
        <Logo taglineClassName="hidden sm:inline" />
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground sm:gap-4">
          <span className="hidden sm:inline">Already have an account?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-brand hover:underline"
          >
            Sign in <ArrowRight className="size-[15px]" />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-3 pb-3 sm:px-6 sm:pb-5 lg:px-8">
        <div className="w-full max-w-[920px] rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] short:p-3.5 sm:rounded-3xl sm:p-6 lg:p-7 dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
          <div className="text-center">
            <span
              className={cn(
                "size-10 items-center justify-center rounded-xl border-2 border-brand bg-brand/10 text-brand sm:size-11",
                step === 1 ? "inline-flex short:hidden" : "hidden",
              )}
            >
              <UserPlus className="size-[22px]" />
            </span>
            <h1
              className={cn(
                "font-extrabold tracking-tight",
                step === 1 ? "mt-3 text-[22px] short:mt-0 sm:text-[26px] lg:text-[28px]" : "text-[20px] short:sr-only sm:text-[24px]",
              )}
            >
              Create your CityPulse account
            </h1>
            <p
              className={cn(
                "mt-1 text-sm text-muted-foreground short:hidden sm:text-[15px]",
                step === 2 && "hidden",
              )}
            >
              Join our intelligent platform and be part of a smarter, smoother
              city.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-3 py-2 sm:mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate>
            {step === 1 ? (
              <>
                <div
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-4 flex items-start gap-3 outline-none short:mt-3 sm:mt-5 sm:gap-3.5"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                    1
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold">
                      Choose your role
                    </span>
                    <span className="block text-[13.5px] text-muted-foreground">
                      Select how you&apos;ll be using CityPulse
                    </span>
                  </span>
                  <span className="ml-auto whitespace-nowrap pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Step 1 of 2
                  </span>
                </div>

                {/* Native radios: Tab reaches the group, arrow keys change the
                    role, Enter continues. Each card is the radio's label. */}
                <fieldset className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-4">
                  <legend className="sr-only">Choose your role</legend>
                  {ROLES.map((roleOption) => {
                    const active = role === roleOption.value;
                    return (
                      <label
                        key={roleOption.value}
                        className={cn(
                          "relative grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border-[1.5px] p-3.5 text-left transition-all short:p-3 sm:block sm:p-4 lg:rounded-2xl lg:p-5",
                          active
                            ? "border-brand bg-brand/5 ring-[3px] ring-brand/15"
                            : "border-border hover:border-brand/55",
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={active}
                          onChange={() => setRole(roleOption.value)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            goToStep(2);
                          }}
                          className="peer sr-only"
                        />
                        {/* keyboard focus ring for the whole card */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -inset-[1.5px] rounded-[inherit] peer-focus-visible:ring-[3px] peer-focus-visible:ring-brand/60"
                        />
                        <span
                          aria-hidden
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
                      </label>
                    );
                  })}
                </fieldset>

                <div className="mt-4 flex justify-end short:mt-3 sm:mt-5">
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
            ) : role === "driver" ? (
              /* Driver accounts are created in the Android app, not here. */
              <>
                <div
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 outline-none short:mt-0 sm:mt-4 sm:gap-x-3.5"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                    2
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold">
                      Download the driver app
                    </span>
                    <span className="hidden text-[13.5px] text-muted-foreground sm:block">
                      Drivers sign up and sign in from the CityPulse mobile app
                    </span>
                  </span>
                  <span className="ml-auto flex items-center gap-2">
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

                <div className="mt-4 grid gap-5 rounded-2xl border border-border bg-muted/55 p-4 sm:mt-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                      <Smartphone className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">
                        Driver accounts are created in the app
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Finding, booking and navigating to parking happen on
                        your phone, so the website can&apos;t create driver
                        accounts. Download the CityPulse app to sign up and
                        sign in. If your phone asks, allow your browser to
                        install apps.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                    {/* /download/apk redirects to the newest APK on GitHub;
                        the browser downloads it and the visitor stays here */}
                    <Button asChild variant="brand" size="lg" className="w-full sm:w-auto">
                      <a href="/download/apk">
                        <Download className="size-[18px]" />
                        Download app
                      </a>
                    </Button>
                    <span className="text-center text-[12.5px] text-muted-foreground sm:text-right">
                      {apkCaption}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 short:mt-3 sm:mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="px-5 sm:min-w-32"
                    onClick={() => goToStep(1)}
                  >
                    Back
                  </Button>
                  <p className="text-[13px] text-muted-foreground">
                    Parking owner or traffic authority?{" "}
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="font-semibold text-brand hover:underline"
                    >
                      Choose another role
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 outline-none short:mt-0 sm:mt-4 sm:gap-x-3.5"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
                    2
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold">
                      Account details
                    </span>
                    <span className="hidden text-[13.5px] text-muted-foreground sm:block">
                      Enter your information to get started
                    </span>
                  </span>
                  <span className="ml-auto flex items-center gap-2">
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
                    label="Full name"
                    name="full_name"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    icon={User}
                    compact
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                    <TextField
                      label="Email address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email address"
                      icon={Mail}
                      compact
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <TextField
                      label="Mobile number"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01712345678"
                      icon={Phone}
                      compact
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
                          ? "Use 11 digits starting 013–019"
                          : undefined
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                    <PasswordChecklistField
                      label="Password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      compact
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <PasswordField
                      label="Confirm password"
                      name="confirm_password"
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      icon={Lock}
                      compact
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      valid={matches}
                      error={
                        confirm.length > 0 && !matches
                          ? "Doesn't match"
                          : undefined
                      }
                      required
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-3 short:mt-3 sm:mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="px-5 sm:min-w-32"
                    onClick={() => goToStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-[#38a9f0] to-[#14d3a8] text-white shadow-[0_12px_28px_-10px_rgba(56,169,240,0.5)] hover:brightness-110"
                    disabled={!canSubmit}
                  >
                    {submitting ? "Creating account…" : "Create account"}
                    <ArrowRight className="size-[18px]" />
                  </Button>
                </div>
              </>
            )}
          </form>

          {step === 2 && role !== "driver" && (
            <div className="mt-3 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground short:mt-2 short:text-[11px] sm:mt-4 sm:items-center sm:text-[13px]">
              <Lock className="mt-0.5 size-3.5 shrink-0 sm:mt-0" />
              <span>
                By creating an account, you agree to our{" "}
                <Link href="/terms" target="_blank" className="text-brand hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
