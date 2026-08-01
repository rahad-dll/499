"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Cctv,
  ChevronRight,
  Gauge,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export type OwnerNavKey = "dashboard" | "cameras" | "revenue" | "settings";

const NAV_ITEMS: { key: OwnerNavKey; icon: LucideIcon; label: string; href: string }[] = [
  { key: "dashboard", icon: LayoutGrid, label: "Dashboard", href: "/owner" },
  { key: "cameras", icon: Cctv, label: "Cameras", href: "/owner/cameras" },
  { key: "revenue", icon: BarChart3, label: "Revenue", href: "/owner/revenue" },
  { key: "settings", icon: Settings, label: "Settings", href: "/owner/settings" },
];

/** Owner portal chrome: auth guard, sidebar (desktop), breadcrumb top bar,
 *  and the mobile bottom tab bar. Wrap page content in it. */
export function OwnerShell({
  active,
  breadcrumb,
  children,
}: {
  active: OwnerNavKey;
  breadcrumb: string;
  children: ReactNode;
}) {
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background">
        <DigitalHeartbeatLoader />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const displayName = user.full_name ?? "Owner";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[248px_1fr]">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo tagline={false} />
        </div>

        <div className="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Menu
        </div>
        <nav className="mt-2 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors",
                item.key === active
                  ? "bg-brand/10 text-teal-600 dark:text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
              {item.key === active && (
                <span className="ml-auto size-2 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-muted/60 p-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-teal-600 dark:text-brand">
            <Gauge className="size-[18px]" />
          </span>
          <div className="mt-3 text-sm font-bold">Pro Analytics</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Unlock AI forecasting &amp; reports.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-border px-1 pt-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#18d6c0] to-[#8b6cff] text-xs font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <div className="truncate text-sm font-bold">{displayName}</div>
            <div className="text-xs capitalize text-muted-foreground">
              {user.role === "owner" ? "Owner" : user.role}
            </div>
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="flex min-h-screen flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="lg:hidden">
            <Logo tagline={false} />
          </div>
          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex">
            Owner
            <ChevronRight className="size-4" />
            <span className="font-semibold text-foreground">{breadcrumb}</span>
          </div>

          <div className="relative ml-auto hidden w-64 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="h-10 rounded-xl bg-muted pl-9" />
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative ml-auto flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground md:ml-0"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive" />
          </button>
          <ThemeToggle />
          <span className="hidden size-10 rounded-full bg-gradient-to-br from-[#18d6c0] via-[#4d7cf5] to-[#8b6cff] sm:block" />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                item.key === active ? "text-teal-600 dark:text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
