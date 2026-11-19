"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleHelp, LogOut, UserRound } from "lucide-react";
import { ThemeMenuItems } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/** "Md. Rahad Hossain" → "MR". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Avatar button that opens the account menu: profile, theme, help and
 * sign out. Keyboard: Enter/Space opens, arrow keys move, Escape closes.
 */
export function UserMenu({
  name,
  roleLabel,
  profileHref,
  profileActive = false,
  showName = false,
}: {
  name: string;
  roleLabel: string;
  /** omit for accounts with no profile page (admin) */
  profileHref?: string;
  profileActive?: boolean;
  /** show the name beside the avatar on very wide screens */
  showName?: boolean;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const initials = initialsOf(name);

  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      // logout always clears the local session, even if the API call fails
      router.replace("/login");
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand data-[state=open]:ring-2 data-[state=open]:ring-brand/60",
            profileActive && "ring-2 ring-brand",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#18d6c0] via-[#4d7cf5] to-[#8b6cff] text-xs font-extrabold text-white shadow-sm">
            {initials}
          </span>
          {showName && <span className="hidden max-w-28 truncate pr-1 text-sm font-bold 2xl:block">{name}</span>}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#18d6c0] via-[#4d7cf5] to-[#8b6cff] text-xs font-extrabold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user?.email ?? roleLabel}</span>
          </span>
        </div>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <UserRound />
              Your profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/#faq">
            <CircleHelp />
            Help &amp; FAQ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={signingOut} onSelect={() => void signOut()}>
          <LogOut />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
