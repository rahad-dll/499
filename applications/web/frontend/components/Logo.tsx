import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark-only CityPulse logo. Links to the landing page. The "City" part
 *  inherits the surrounding text color; "Pulse" uses the theme's logo accent
 *  (cyan #00d3ea in light, teal #00c9b1 in dark). */
export function Logo({
  tagline = true,
  className,
  taglineClassName,
}: {
  tagline?: boolean;
  className?: string;
  taglineClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="CityPulse — go to home"
      className={cn("inline-flex flex-col leading-none no-underline", className)}
    >
      <span className="text-[22px] font-extrabold tracking-tight text-current">
        City<span className="text-logo-pulse">Pulse</span>
      </span>
      {tagline && (
        <span className={cn("mt-0.5 text-xs text-muted-foreground", taglineClassName)}>
          Intelligent Parking &amp; Traffic Control
        </span>
      )}
    </Link>
  );
}
