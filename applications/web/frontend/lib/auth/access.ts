import { roleDestination } from "./destination.ts";
import type { Role } from "./types";

/**
 * Route access rules, shared by `proxy.ts` (server, before a page renders) and
 * the client pages. The proxy takes the role from the NextAuth session cookie.
 */

const KNOWN_ROLES: Role[] = ["driver", "owner", "authority", "admin"];

/** Each portal and the one role that may open it. */
const PORTALS: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/owner", role: "owner" },
  { prefix: "/command-center", role: "authority" },
];

/** Pages that only make sense signed out. */
const GUEST_ONLY = ["/login", "/signup"];

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** `value` as a role, or null when it is missing or not a known role. */
export function parseRole(value: unknown): Role | null {
  return KNOWN_ROLES.includes(value as Role) ? (value as Role) : null;
}

/** The role a path needs, or null for pages anyone may open. */
export function requiredRole(pathname: string): Role | null {
  return PORTALS.find((portal) => under(pathname, portal.prefix))?.role ?? null;
}

/**
 * Where to send a request instead of `pathname`, or null to let it through.
 *
 * - a portal page, signed out: the login page, which returns here afterwards
 * - a portal page, wrong role: that role's own home
 * - login or signup, already signed in: that role's own home
 */
export function accessRedirect(pathname: string, role: Role | null): string | null {
  const needed = requiredRole(pathname);
  if (needed) {
    if (!role) return `/login?next=${encodeURIComponent(pathname)}`;
    return role === needed ? null : roleDestination(role);
  }
  if (role && GUEST_ONLY.some((page) => under(pathname, page))) {
    return roleDestination(role);
  }
  return null;
}

/**
 * The page to open after sign-in: the `next` page the user was sent to login
 * from when their role may open it, otherwise the role's home. Anything that is
 * not a plain in-app path is ignored, so `next` cannot redirect off-site.
 */
export function postLoginDestination(next: string | null | undefined, role: Role): string {
  const fallback = roleDestination(role, "login");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  const pathname = next.split(/[?#]/)[0];
  return requiredRole(pathname) === role ? next : fallback;
}
