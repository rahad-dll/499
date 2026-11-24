import { NextResponse } from "next/server";
import { formatApkDate } from "@/lib/driver-app/apk";
import { findLatestApk } from "@/lib/driver-app/latest-apk";
import { formatBytes } from "@/lib/media/photos";

/**
 * GET /download/apk/info — what the "Download the app" buttons show under
 * themselves: the latest APK's size and the date it was last updated on
 * GitHub. Used by the static 3D city page, which can't render server data.
 *
 * { available: true, size: "95.2 MB", updated: "10 Nov 2026", updatedAt, href }
 * { available: false } when GitHub can't be reached.
 */
export async function GET() {
  const apk = await findLatestApk();
  const body = apk
    ? {
        available: true,
        href: "/download/apk",
        name: apk.name,
        bytes: apk.size,
        size: apk.size ? formatBytes(apk.size) : null,
        updatedAt: apk.updatedAt,
        updated: apk.updatedAt ? formatApkDate(apk.updatedAt) : null,
      }
    : { available: false, href: "/download/apk" };
  return NextResponse.json(body, {
    // short browser/CDN cache; the GitHub lookup itself is cached for 5 minutes
    headers: {
      "Cache-Control": apk ? "public, max-age=60, s-maxage=300" : "no-store",
      // public data; lets the 3D page's own dev server (another origin) read it
      "Access-Control-Allow-Origin": "*",
    },
  });
}
