"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LayoutGrid, ShieldCheck, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageSkeleton } from "@/components/portal/PageSkeleton";
import { UserMenu } from "@/components/portal/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export type AdminNavKey = "overview";

/* One page for now; add an entry here for each new /admin/<page>. */
const NAV_ITEMS: {
  key: AdminNavKey;
  icon: LucideIcon;
  label: string;
  href: string;
}[] = [
  { key: "overview", icon: LayoutGrid, label: "Overview", href: "/admin" },
];

/** Admin portal chrome: auth guard and top bar.
 *  proxy.ts already keeps other roles out before the page loads; this guard
 *  covers a session that ended in the browser while the cookie was still set.
 *  The chrome renders straight away; until the signed-in admin is confirmed
 *  the page area shows a skeleton instead of `children`. */
export function AdminShell({
  active,
  children,
}: {
  active: AdminNavKey;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?next=/admin");
    else if (user.role !== "admin") router.replace("/dashboard");
  }, [loading, user, router]);

  const ready = !loading && user?.role === "admin";
  const displayName = (ready && user.full_name) || "Admin";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <Logo tagline={false} />

        <nav className="hidden items-center gap-1.5 sm:flex">
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
          <Badge variant="info" className="px-3 py-1.5">
            <ShieldCheck />
            Admin
          </Badge>
          {/* on phones the theme choice lives in the account menu */}
          <ThemeToggle className="hidden sm:inline-flex" />
          {ready ? (
            <UserMenu name={displayName} roleLabel="CityPulse admin" showName />
          ) : (
            <Skeleton className="size-10 shrink-0 rounded-full" />
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {ready ? children : <PageSkeleton />}
      </main>
    </div>
  );
}
