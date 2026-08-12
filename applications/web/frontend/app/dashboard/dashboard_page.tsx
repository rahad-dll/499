"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import { useAuth } from "@/context/AuthContext";
import { roleDestination } from "@/lib/auth/destination";

/**
 * Backwards-compatible entry point for old links and bookmarks.
 * New sign-in flows route directly to the correct role workspace.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? roleDestination(user.role) : "/login");
  }, [loading, router, user]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <DigitalHeartbeatLoader />
      <div>
        <p className="font-semibold text-foreground">Opening your workspace</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming your CityPulse account…
        </p>
      </div>
    </main>
  );
}
