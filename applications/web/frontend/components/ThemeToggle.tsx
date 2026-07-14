"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark";

function currentMode(): Mode {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  // Must match the server render ("light") on the first client render to avoid
  // a hydration mismatch — the real mode is read after mount in useEffect.
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    setMode(currentMode());
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cp-theme", next);
    setMode(next);
  }

  const isDark = mode === "dark";

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
