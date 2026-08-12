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
import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import { Badge } from "@/components/ui/badge";
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
  { key: "command", icon: LayoutGrid, label: "Command Center", short: "Command", href: "/command-center" },
  { key: "zones", icon: Map, label: "Zones", short: "Zones", href: "/command-center/zones" },
  { key: "enforcement", icon: Shield, label: "Enforcement", short: "Enforce", href: "/command-center/enforcement" },
  { key: "analytics", icon: BarChart3, label: "Analytics", short: "Analytics", href: "/command-center/analytics" },
];

/** Traffic-authority chrome: auth guard, top nav pills, mobile bottom tabs.
 *  `lockViewport` pins the page to the viewport (used by the Command Center map). */
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

  if (loading || !user || user.role !== "authority") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background">
        <DigitalHeartbeatLoader />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const displayName = user.full_name ?? "Authority";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            Traffic Authority
          </Badge>
          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive" />
          </button>
          <ThemeToggle />
          <Link
            href="/command-center/profile"
            aria-label="Open traffic authority profile"
            aria-current={active === "profile" ? "page" : undefined}
            title={displayName}
            className={cn(
              "flex items-center gap-2 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              active === "profile" && "ring-2 ring-brand",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#18d6c0] via-[#4d7cf5] to-[#8b6cff] text-xs font-extrabold text-white shadow-sm">
              {initials}
            </span>
            <span className="hidden max-w-28 truncate text-sm font-bold 2xl:block">
              {displayName}
            </span>
          </Link>
        </div>
      </header>

      {children}

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
