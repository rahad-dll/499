import DriverAppPage, { type DriverAppSource } from "./driver_app_page";

function readSource(value: string | string[] | undefined): DriverAppSource {
  const source = Array.isArray(value) ? value[0] : value;
  if (source === "signup" || source === "login") return source;
  return "session";
}

function readDriverAppUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <DriverAppPage
      source={readSource(params.source)}
      driverAppUrl={readDriverAppUrl(
        process.env.NEXT_PUBLIC_DRIVER_APP_URL,
      )}
    />
  );
}
