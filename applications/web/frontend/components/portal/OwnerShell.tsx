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
  Map as MapIcon,
  ParkingCircle,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageSkeleton } from "@/components/portal/PageSkeleton";
import { UserMenu, initialsOf } from "@/components/portal/UserMenu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export type OwnerNavKey =
  | "dashboard"
  | "map"
  | "register"
  | "cameras"
  | "revenue"
  | "settings"
  | "profile";

const NAV_ITEMS: {
  key: Exclude<OwnerNavKey, "profile">;
  icon: LucideIcon;
  label: string;
  /** label in the phone's bottom tab bar */
  short: string;
  href: string;
}[] = [
  { key: "dashboard", icon: LayoutGrid, label: "Dashboard", short: "Home", href: "/owner" },
  { key: "map", icon: MapIcon, label: "Lot map", short: "Map", href: "/owner/map" },
  { key: "register", icon: ParkingCircle, label: "Register lot", short: "Register", href: "/owner/spaces/new" },
  { key: "cameras", icon: Cctv, label: "Cameras", short: "Cameras", href: "/owner/cameras" },
  { key: "revenue", icon: BarChart3, label: "Revenue", short: "Revenue", href: "/owner/revenue" },
  { key: "settings", icon: Settings, label: "Settings", short: "Settings", href: "/owner/settings" },
];

/** Owner portal chrome: auth guard, sidebar (desktop), breadcrumb top bar,
 *  and the mobile bottom tab bar. Wrap page content in it.
 *  The chrome renders straight away; until the signed-in owner is confirmed
 *  the content area shows a skeleton instead of `children`.
 *  `lockViewport` pins the page to the viewport on desktop; the content then
 *  gets a flex column to fill (used by the Register Lot wizard). */
export function OwnerShell({
  active,
  breadcrumb,
  lockViewport = false,
  children,
}: {
  active: OwnerNavKey;
  breadcrumb: string;
  lockViewport?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "owner") router.replace("/dashboard");
  }, [loading, user, router]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  const ready = !loading && user?.role === "owner";
  const displayName = (ready && user.full_name) || "Owner";

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
              aria-current={item.key === active ? "page" : undefined}
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

        {ready ? (
        <div className="mt-4 flex items-center gap-2 border-t border-border px-1 pt-4">
          <Link
            href="/owner/profile"
            aria-label="Open owner profile"
            aria-current={active === "profile" ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted",
              active === "profile" && "bg-brand/10",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#18d6c0] to-[#8b6cff] text-xs font-bold text-white">
              {initialsOf(displayName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{displayName}</span>
              <span className="block text-xs text-muted-foreground">Parking owner</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 border-t border-border px-2.5 pt-5">
            <Skeleton className="size-9 rounded-full" />
            <span className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </span>
          </div>
        )}
      </aside>

      {/* main column */}
      <div
        className={cn(
          "flex min-h-screen flex-col pb-24 lg:pb-0",
          lockViewport && "lg:h-screen lg:min-h-0 lg:overflow-hidden",
        )}
      >
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
          {/* on phones the theme choice lives in the account menu */}
          <ThemeToggle className="hidden sm:inline-flex" />
          {ready ? (
            <UserMenu
              name={displayName}
              roleLabel="Parking owner"
              profileHref="/owner/profile"
              profileActive={active === "profile"}
            />
          ) : (
            <Skeleton className="size-10 shrink-0 rounded-full" />
          )}
        </header>

        <main
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-8",
            lockViewport && "lg:flex lg:min-h-0 lg:flex-col lg:py-4",
          )}
        >
          {ready ? children : <PageSkeleton />}
        </main>
      </div>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                item.key === active ? "text-teal-600 dark:text-brand" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
