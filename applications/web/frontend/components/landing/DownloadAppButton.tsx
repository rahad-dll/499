import type { VariantProps } from "class-variance-authority";
import { Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatApkDate } from "@/lib/driver-app/apk";
import { findLatestApk, type LatestApk } from "@/lib/driver-app/latest-apk";
import { formatBytes } from "@/lib/media/photos";
import { cn } from "@/lib/utils";

/** The driver app download; /download/apk always serves the newest APK on GitHub. */
export const DOWNLOAD_APP_HREF = "/download/apk";

/** "Android APK · 95.2 MB · Updated 10 Nov 2026" (parts GitHub couldn't give are left out). */
export function apkCaption(apk: LatestApk | null): string {
  const parts = ["Android APK"];
  if (apk?.size) parts.push(formatBytes(apk.size));
  parts.push(apk?.updatedAt ? `Updated ${formatApkDate(apk.updatedAt)}` : "latest build");
  return parts.join(" · ");
}

/**
 * "Download the app" button with the APK's size underneath (when GitHub
 * could be asked). Server component: the size comes from the same cached
 * GitHub listing /download/apk uses, refreshed every 5 minutes.
 */
export async function DownloadAppButton({
  variant = "brand",
  className,
  buttonClassName,
  captionClassName,
}: {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  buttonClassName?: string;
  captionClassName?: string;
}) {
  const apk = await findLatestApk();
  return (
    <span className={cn("inline-flex flex-col items-start gap-1.5", className)}>
      <Button asChild variant={variant} size="lg" className={buttonClassName}>
        {/* a plain link: the route redirects to the file, the browser downloads
            it and the visitor stays on this page */}
        <a href={DOWNLOAD_APP_HREF}>
          <Download className="size-[18px]" /> Download the app
        </a>
      </Button>
      <span className={cn("text-[12.5px] text-muted-foreground", captionClassName)}>
        {apkCaption(apk)}
      </span>
    </span>
  );
}
