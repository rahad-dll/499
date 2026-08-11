import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark-only CityPulse logo. Links to the landing page. The "City" part
 *  inherits the surrounding text color so it works on light pages and the
 *  dark brand panel; "Pulse" is always brand-teal. */
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
        City<span className="text-brand">Pulse</span>
      </span>
      {tagline && (
        <span className={cn("mt-0.5 text-xs text-muted-foreground", taglineClassName)}>
          Intelligent Parking &amp; Traffic Control
        </span>
      )}
    </Link>
  );
}
