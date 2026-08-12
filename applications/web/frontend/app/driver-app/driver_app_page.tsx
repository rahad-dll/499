"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  LockKeyhole,
  LogOut,
  MapPin,
  Navigation,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { roleDestination } from "@/lib/auth/destination";

export type DriverAppSource = "login" | "signup" | "session";

const HANDOFF_COPY: Record<
  DriverAppSource,
  { eyebrow: string; title: string; description: string }
> = {
  signup: {
    eyebrow: "Account created successfully",
    title: "Your driver account is ready.",
    description:
      "CityPulse driver tools are designed for mobile use. Keep this account, then use the administrator-provided app link when it is published.",
  },
  login: {
    eyebrow: "Welcome back",
    title: "Continue your driver journey on mobile.",
    description:
      "You signed in to your CityPulse driver account. Parking and navigation tools are intended for the mobile experience and are not available in this web portal.",
  },
  session: {
    eyebrow: "Driver account",
    title: "Continue your driver journey on mobile.",
    description:
      "CityPulse driver tools are intended for the mobile experience and are not available in this web portal.",
  },
};

export default function DriverAppPage({
  source,
  driverAppUrl,
}: {
  source: DriverAppSource;
  driverAppUrl: string | null;
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const copy = HANDOFF_COPY[source];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "driver") {
      router.replace(roleDestination(user.role));
    }
  }, [loading, router, user]);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // The repository clears the local session even if the API is unavailable.
    } finally {
      router.replace("/login");
    }
  }

  if (loading || !user || user.role !== "driver") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <DigitalHeartbeatLoader />
        <p className="text-sm text-muted-foreground">
          Confirming your driver account…
        </p>
      </main>
    );
  }

  const displayName = user.full_name?.trim() || "CityPulse driver";

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_18%_15%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_36%),radial-gradient(circle_at_85%_5%,color-mix(in_srgb,var(--brand-2)_14%,transparent),transparent_30%)]"
      />

      <header className="border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Logo taglineClassName="hidden sm:inline" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="success" className="hidden sm:inline-flex">
              <span className="size-1.5 rounded-full bg-current" />
              Driver account active
            </Badge>
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              disabled={loggingOut}
              aria-label="Log out of CityPulse"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">
                {loggingOut ? "Logging out…" : "Log out"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] lg:gap-6 lg:px-8 lg:py-14">
        <Card className="relative min-w-0 overflow-hidden gap-0 border-brand/20">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
          />
          <CardHeader className="relative px-5 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="py-1">
                <CheckCircle2 />
                {copy.eyebrow}
              </Badge>
              <Badge variant="outline" className="py-1 text-muted-foreground">
                <Smartphone /> Mobile handoff
              </Badge>
            </div>
            <CardTitle className="mt-5 max-w-2xl text-[clamp(2rem,5vw,3.65rem)] leading-[1.02] tracking-[-0.045em]">
              {copy.title}
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-[15px] leading-7 sm:text-base">
              {copy.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="relative px-5 pb-5 pt-7 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10">
            <div className="grid gap-5 rounded-2xl border border-border bg-muted/55 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                  <Download className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">
                    Official CityPulse Driver app
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {driverAppUrl
                      ? "Use the administrator-provided download destination."
                      : "The official download destination has not been published yet."}
                  </p>
                </div>
              </div>

              {driverAppUrl ? (
                <Button
                  asChild
                  variant="brand"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <a
                    href={driverAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download mobile app
                    <ArrowUpRight className="size-[18px]" />
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled
                >
                  Download link coming soon
                  <Download className="size-[18px]" />
                </Button>
              )}
            </div>

            <Alert className="mt-5 bg-card/80">
              <ShieldCheck />
              <AlertTitle>Integration status</AlertTitle>
              <AlertDescription className="leading-5">
                This page provides a download handoff only. It does not verify
                that a mobile build is connected to the current CityPulse API.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid min-w-0 content-start gap-5">
          <Card className="gap-0 overflow-hidden">
            <div className="relative h-36 overflow-hidden bg-[linear-gradient(145deg,#0b172a,#102642_58%,#0c4c50)] text-white sm:h-40">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:28px_28px]"
              />
              <div
                aria-hidden="true"
                className="absolute left-[18%] top-[64%] h-px w-[58%] -rotate-12 bg-gradient-to-r from-brand via-brand-2 to-transparent shadow-[0_0_12px_var(--brand)]"
              />
              <span className="absolute left-[14%] top-[57%] flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-brand backdrop-blur">
                <MapPin className="size-4" />
              </span>
              <span className="absolute right-[18%] top-[25%] flex size-12 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand shadow-[0_0_28px_rgba(20,211,178,.24)] backdrop-blur">
                <Navigation className="size-5" />
              </span>
              <p className="absolute bottom-4 left-5 text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                Mobile route handoff
              </p>
            </div>

            <CardHeader className="px-5 pt-5">
              <CardDescription>Your signed-in account</CardDescription>
              <CardTitle className="truncate text-xl">{displayName}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-5">
              <dl className="grid gap-3 text-sm">
                <div className="rounded-xl border border-border bg-muted/45 px-3.5 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-1 break-all font-semibold text-foreground">
                    {user.email}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/45 px-3.5 py-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Account type
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      Driver
                    </dd>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    <LockKeyhole className="size-4" />
                  </span>
                </div>
              </dl>
            </CardContent>
          </Card>

          <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
            Need to use a different account? Log out, then sign in with the
            correct CityPulse credentials.
          </p>
        </div>
      </main>
    </div>
  );
}
