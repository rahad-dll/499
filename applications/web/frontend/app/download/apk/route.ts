import { NextResponse } from "next/server";
import { APK_FOLDER_PAGE_URL } from "@/lib/driver-app/apk";
import { findLatestApk } from "@/lib/driver-app/latest-apk";

/**
 * GET /download/apk — starts downloading the latest CityPulse driver APK.
 *
 * Redirects to the APK's raw GitHub URL. GitHub sends it as a binary file
 * (application/octet-stream), so the browser downloads it and the visitor
 * stays on the page they clicked from. The file (~60 MB) is far too large to
 * pass through this server.
 *
 * If GitHub can't be reached at all, the visitor goes to the GitHub folder,
 * where the APK can be downloaded by hand — never to a sign-in page.
 */
export async function GET() {
  const apk = await findLatestApk();
  const response = NextResponse.redirect(apk?.url ?? APK_FOLDER_PAGE_URL, 302);
  // the APK changes over time: never let a browser or CDN reuse this redirect
  response.headers.set("Cache-Control", "no-store");
  return response;
}
