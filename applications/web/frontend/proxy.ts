import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { accessRedirect, parseRole } from "@/lib/auth/access";

/** The browser-only demo store has no server session for the proxy to read. */
const LOCAL_AUTH = process.env.NEXT_PUBLIC_AUTH_BACKEND === "local";

/**
 * Role-based redirects before a page renders (Next.js 16 calls Middleware
 * "Proxy"). It reads the signed-in role from the NextAuth session cookie and
 * applies the rules in lib/auth/access.ts:
 *
 * - /admin, /owner and /command-center open only for their own role
 * - signed-out visitors go to /login and come back afterwards
 * - signed-in users skip /login and /signup
 *
 * The cookie is encrypted with NEXTAUTH_SECRET, so the role cannot be forged.
 * The API still verifies the access token and the role on every request.
 */
export async function proxy(request: NextRequest) {
  if (LOCAL_AUTH) return NextResponse.next();

  const token = await getToken({ req: request });
  // a session the server could not renew counts as signed out
  const role = token && !token.error ? parseRole(token.role) : null;
  const target = accessRedirect(request.nextUrl.pathname, role);
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/command-center/:path*",
    "/login",
    "/signup",
  ],
};
