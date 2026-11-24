"use client";

import { ArrowRight, Rotate3d } from "lucide-react";
import { CITY_3D_URL, LANDING_PREF_KEY } from "@/components/landing/city3d";
import { cn } from "@/lib/utils";

/* Choosing the 3D city on purpose undoes an earlier "classic site" choice. */
function forgetClassicChoice() {
  try {
    localStorage.removeItem(LANDING_PREF_KEY);
  } catch {
    // storage blocked: nothing to forget
  }
}

const ICON_DOT = "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0cc9ae] to-[#7c5cff] text-white";

/**
 * Opens the 3D city tour.
 *  - `nav`: pill in the top bar (icon on small laptops, label on wider screens)
 *  - `icon`: round icon button for the phone top bar
 *  - `menu`: full-width row in the phone menu
 *  - `link`: plain text link (footer)
 */
export function Explore3DLink({
  variant,
  className,
  onNavigate,
}: {
  variant: "nav" | "icon" | "menu" | "link";
  className?: string;
  onNavigate?: () => void;
}) {
  const onClick = () => {
    forgetClassicChoice();
    onNavigate?.();
  };

  if (variant === "link") {
    return (
      <a href={CITY_3D_URL} onClick={onClick} className={className}>
        Explore the 3D city
      </a>
    );
  }

  if (variant === "icon") {
    return (
      <a
        href={CITY_3D_URL}
        onClick={onClick}
        aria-label="Explore the 3D city"
        title="Explore the 3D city"
        className={cn(ICON_DOT, "size-10 shadow-[0_8px_20px_-10px_var(--brand)]", className)}
      >
        <Rotate3d className="size-[18px]" />
      </a>
    );
  }

  if (variant === "menu") {
    return (
      <a
        href={CITY_3D_URL}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-brand/35 bg-brand/[0.06] px-3 py-2.5 font-semibold",
          className,
        )}
      >
        <span className={cn(ICON_DOT, "size-8")}>
          <Rotate3d className="size-4" />
        </span>
        <span>
          Explore the 3D city
          <span className="block text-[12px] font-normal text-muted-foreground">Best on a laptop with Wi-Fi</span>
        </span>
        <ArrowRight className="ml-auto size-4 text-brand" />
      </a>
    );
  }

  return (
    <a
      href={CITY_3D_URL}
      onClick={onClick}
      aria-label="Explore the 3D city"
      title="Interactive WebGL tour · best on a laptop with Wi-Fi"
      className={cn(
        "group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-brand/40 bg-card/85 p-1 text-[13.5px] font-semibold text-foreground transition-colors hover:border-brand/80 xl:pr-3",
        className,
      )}
    >
      <span className={cn(ICON_DOT, "size-7")}>
        <Rotate3d className="size-[15px]" />
      </span>
      <span className="hidden xl:max-[1399px]:inline">3D city</span>
      <span className="hidden min-[1400px]:inline">Explore the 3D city</span>
      <ArrowRight className="hidden size-3.5 text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none xl:block" />
    </a>
  );
}
