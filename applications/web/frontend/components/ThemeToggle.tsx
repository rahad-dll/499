"use client";

import { Moon, Sun } from "lucide-react";
import { useDarkTheme } from "@/components/maps/use-dark-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  // Light is the default; dark only when the user has explicitly chosen it.
  // useDarkTheme reports light during hydration (matching the server render)
  // and then syncs to the real `data-theme` on <html>.
  const isDark = useDarkTheme();

  function toggle() {
    const next = isDark ? "light" : "dark";
    // The data-theme MutationObserver in useDarkTheme picks this up.
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cp-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "relative inline-flex h-9 w-[74px] shrink-0 items-center rounded-full border border-border bg-muted transition-colors hover:border-brand/50",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute left-2 size-3.5 text-muted-foreground transition-opacity",
          isDark ? "opacity-100" : "opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute right-2 size-3.5 text-muted-foreground transition-opacity",
          isDark ? "opacity-0" : "opacity-100",
        )}
      />
      <span
        className={cn(
          "absolute top-[3px] left-[3px] flex size-[28px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_10px_var(--brand),0_0_22px_color-mix(in_srgb,var(--brand)_35%,transparent)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)]",
          isDark ? "translate-x-[38px]" : "translate-x-0",
        )}
      >
        {isDark ? (
          <Moon key="moon" className="size-3.5" />
        ) : (
          <Sun key="sun" className="size-3.5" />
        )}
      </span>
    </button>
  );
}
