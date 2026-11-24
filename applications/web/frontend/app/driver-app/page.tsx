import { findLatestApk } from "@/lib/driver-app/latest-apk";
import DriverAppPage, { type DriverAppSource } from "./driver_app_page";

function readSource(value: string | string[] | undefined): DriverAppSource {
  const source = Array.isArray(value) ? value[0] : value;
  if (source === "signup" || source === "login") return source;
  return "session";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[]; apk?: string | string[] }>;
}) {
  const params = await searchParams;
  // only for the size shown on the button; the download itself is /download/apk
  const apk = await findLatestApk();

  return (
    <DriverAppPage
      source={readSource(params.source)}
      apkSize={apk?.size ?? null}
      // set by /download/apk when GitHub couldn't be reached
      downloadFailed={params.apk === "unavailable"}
    />
  );
}
