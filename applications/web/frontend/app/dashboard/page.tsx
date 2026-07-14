"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  driver: "Driver",
  owner: "Parking Owner",
  authority: "Traffic Authority",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <DigitalHeartbeatLoader />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" onClick={onLogout}>
            Log Out
          </Button>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] rounded-3xl border border-border bg-card p-9 text-center text-card-foreground shadow-[0_24px_60px_-20px_rgba(23,32,51,0.18)] dark:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.55)]">
          <span className="mx-auto flex size-[76px] items-center justify-center rounded-full border-2 border-[var(--success)] text-[var(--success)] shadow-[0_0_0_12px_color-mix(in_srgb,var(--success)_7%,transparent)]">
            <CheckCircle2 className="size-[30px]" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
            Welcome{user.full_name ? `, ${user.full_name}` : ""}!
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            You are logged in as{" "}
            <b className="text-foreground">{ROLE_LABEL[user.role] ?? user.role}</b>
            <br />
            {user.email}
          </p>
          <div className="mt-5 rounded-xl border border-border bg-muted px-4 py-3 text-center text-[13.5px] text-muted-foreground">
            The {ROLE_LABEL[user.role] ?? user.role} dashboard is coming soon.
          </div>
        </div>
      </main>
    </div>
  );
}
