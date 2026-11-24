"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  LayoutGrid,
  Map,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageSkeleton } from "@/components/portal/PageSkeleton";
import { UserMenu } from "@/components/portal/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export type AuthorityNavKey =
  | "command"
  | "zones"
  | "enforcement"
  | "analytics"
  | "profile";

const NAV_ITEMS: {
  key: Exclude<AuthorityNavKey, "profile">;
  icon: LucideIcon;
  label: string;
  short: string;
  href: string;
}[] = [
  { key: "command", icon: LayoutGrid, label: "Command center", short: "Command", href: "/command-center" },
  { key: "zones", icon: Map, label: "Zones", short: "Zones", href: "/command-center/zones" },
  { key: "enforcement", icon: Shield, label: "Enforcement", short: "Enforce", href: "/command-center/enforcement" },
  { key: "analytics", icon: BarChart3, label: "Analytics", short: "Analytics", href: "/command-center/analytics" },
];

/** Traffic-authority chrome: auth guard, top nav pills, mobile bottom tabs.
 *  `lockViewport` pins the page to the viewport (used by the command center map).
 *  The chrome renders straight away; until the signed-in authority is
 *  confirmed the page area shows a skeleton instead of `children`. */
export function AuthorityShell({
  active,
  lockViewport = false,
  children,
}: {
  active: AuthorityNavKey;
  lockViewport?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "authority") router.replace("/dashboard");
  }, [loading, user, router]);

  const ready = !loading && user?.role === "authority";
  const displayName = (ready && user.full_name) || "Traffic authority";

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background pb-20 lg:pb-0",
        lockViewport && "lg:h-screen lg:overflow-hidden",
      )}
    >
      {/* top bar */}
      <header className="z-30 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <Logo tagline={false} />

        <nav className="hidden items-center gap-1.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                item.key === active
                  ? "border border-brand/40 bg-brand/10 text-teal-600 dark:text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Badge variant="purple" className="hidden px-3 py-1.5 sm:inline-flex">
            <Shield />
            Traffic authority
          </Badge>
          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive" />
          </button>
          {/* on phones the theme choice lives in the account menu */}
          <ThemeToggle className="hidden sm:inline-flex" />
          {ready ? (
            <UserMenu
              name={displayName}
              roleLabel="Traffic authority"
              profileHref="/command-center/profile"
              profileActive={active === "profile"}
              showName
            />
          ) : (
            <Skeleton className="size-10 shrink-0 rounded-full" />
          )}
        </div>
      </header>

      {ready ? (
        children
      ) : (
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <PageSkeleton />
        </main>
      )}

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
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
