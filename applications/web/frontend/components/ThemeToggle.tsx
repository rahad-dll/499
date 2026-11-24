"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDarkTheme } from "@/components/maps/use-dark-theme";
import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System radio items, for any dropdown menu. */
export function ThemeMenuItems() {
  const preference = useThemePreference();
  return (
    <DropdownMenuRadioGroup
      value={preference}
      onValueChange={(value) => setThemePreference(value as ThemePreference)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** Round theme button: shows the current theme and opens Light / Dark / System. */
export function ThemeToggle({ className }: { className?: string }) {
  // useDarkTheme reports light during hydration (matching the server render)
  // and then syncs to the real `data-theme` on <html>.
  const isDark = useDarkTheme();
  const preference = useThemePreference();
  const Icon = preference === "system" ? Monitor : isDark ? Moon : Sun;
  const current = OPTIONS.find((o) => o.value === preference)?.label ?? "Light";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${current}. Change theme`}
          title="Change theme"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand data-[state=open]:border-brand/60 data-[state=open]:text-foreground",
            className,
          )}
        >
          <Icon className="size-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Keeps "System" in step with the OS setting and with other tabs. Renders nothing. */
export function ThemeSync() {
  useThemePreference();
  return null;
}
