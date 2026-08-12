"use client";

import { Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

type ProfileRole = "owner" | "authority";

const ROLE_FALLBACK: Record<ProfileRole, string> = {
  owner: "Parking Owner",
  authority: "Traffic Authority",
};

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PortalProfile({ role }: { role: ProfileRole }) {
  const { user } = useAuth();
  const displayName = user?.full_name?.trim() || ROLE_FALLBACK[role];

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-4xl items-center justify-center py-6 sm:py-10">
      <Card className="relative w-full overflow-hidden border-brand/20 bg-card shadow-none">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#18d6c0] via-[#26b7e8] to-[#8b6cff]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
        />

        <CardContent className="relative flex flex-col items-center px-5 py-12 text-center sm:px-10 sm:py-16">
          <Badge variant="outline" className="gap-2 border-brand/30 bg-brand/10 px-3 py-1.5 text-teal-600 dark:text-brand">
            <Clock3 className="size-3.5" />
            Coming soon
          </Badge>

          <div className="relative mt-7">
            <span
              aria-hidden="true"
              className="absolute inset-[-12px] rounded-[2rem] border border-brand/20"
            />
            <span className="relative flex size-24 items-center justify-center rounded-3xl bg-[linear-gradient(145deg,#18d6c0,#26b7e8_55%,#8b6cff)] text-3xl font-extrabold text-white shadow-[0_22px_45px_-18px_rgba(38,183,232,0.9)] sm:size-28">
              {initials(displayName) || <UserRound className="size-10" />}
            </span>
          </div>

          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-teal-600 dark:text-brand">
            Profile name
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {displayName}
          </h1>

          <div className="mt-8 w-full max-w-xl border-t border-border pt-7">
            <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
              Profile features are coming soon
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              More profile information and editing controls will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
