"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, Car, Landmark, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_AUDIENCES, type AudienceKey } from "@/components/landing/data";
import { cn } from "@/lib/utils";

const ICONS: Record<AudienceKey, LucideIcon> = { driver: Car, owner: Building2, authority: Landmark };

/* Where each device sits in the desktop composition. On phones only the
   selected role's device is shown, full width. */
const SLOT: Record<AudienceKey, string> = {
  authority: "md:relative md:mx-auto md:w-[64%]",
  driver: "md:absolute md:bottom-0 md:left-[2%] md:z-10 md:w-[17%]",
  owner: "md:absolute md:-bottom-8 md:right-[1%] md:z-10 md:w-[30%]",
};
const MOBILE_SIZE: Record<AudienceKey, string> = {
  authority: "w-full",
  driver: "mx-auto w-[62%] max-w-[250px]",
  owner: "w-full",
};

/**
 * Hero role switcher: picking Drivers / Parking owners / Traffic authorities
 * changes the pitch and the main button, and highlights that role's device.
 * Every pitch and button label is rendered in the same grid cell, so nothing
 * around them moves when the role changes.
 */
export function HeroShowcase({
  trust,
  devices,
}: {
  trust: React.ReactNode;
  devices: Record<AudienceKey, React.ReactNode>;
}) {
  const [role, setRole] = useState<AudienceKey>("driver");
  const current = HERO_AUDIENCES.find((a) => a.key === role) ?? HERO_AUDIENCES[0];

  return (
    <>
      <div
        role="group"
        aria-label="Show CityPulse for"
        className="mx-auto mt-7 inline-flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-border bg-card/90 p-1 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur sm:rounded-full"
      >
        {HERO_AUDIENCES.map((a) => {
          const Icon = ICONS[a.key];
          const on = a.key === role;
          return (
            <button
              key={a.key}
              type="button"
              aria-pressed={on}
              onClick={() => setRole(a.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                on ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {a.label}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-5 grid max-w-[640px]">
        {HERO_AUDIENCES.map((a) => (
          <p
            key={a.key}
            aria-hidden={a.key !== role}
            className={cn(
              "col-start-1 row-start-1 text-[17.5px] leading-relaxed text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none",
              a.key === role ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            {a.pitch}
          </p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand" size="lg">
          <Link href={current.cta.href}>
            <span className="grid">
              {HERO_AUDIENCES.map((a) => (
                <span
                  key={a.key}
                  aria-hidden={a.key !== role}
                  className={cn("col-start-1 row-start-1", a.key === role ? "visible" : "invisible")}
                >
                  {a.cta.label}
                </span>
              ))}
            </span>
            <ArrowRight className="size-[18px]" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="#how">See how it works</a>
        </Button>
      </div>

      {trust}

      <div className="relative mx-auto mt-14 max-w-[1080px] md:pt-10">
        {HERO_AUDIENCES.map((a) => {
          const on = a.key === role;
          return (
            <div key={a.key} className={cn(on ? "block" : "hidden md:block", MOBILE_SIZE[a.key], SLOT[a.key])}>
              <div className="relative isolate text-left">
                {/* soft brand glow behind the selected device */}
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -inset-8 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--brand)_26%,transparent),transparent)] transition-opacity duration-300 motion-reduce:transition-none",
                    on ? "opacity-100" : "opacity-0",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setRole(a.key)}
                  className={cn(
                    "absolute -top-4 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-bold transition-colors md:block",
                    on ? "border-brand bg-brand text-white" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.device}
                </button>
                {devices[a.key]}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
