// Route entry — Next.js reserves the filename "page.tsx".
// Implementation: ./signup_page.tsx
import { apkCaption } from "@/components/landing/DownloadAppButton";
import { ROLES } from "@/lib/auth/types";
import { findLatestApk } from "@/lib/driver-app/latest-apk";
import SignupPage from "./signup_page";

// `/signup?role=owner` (from the landing page) opens with that role selected.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role } = await searchParams;
  const initialRole = ROLES.find((r) => r === role);
  // drivers sign up in the Android app; this is the caption under its download button
  const apk = await findLatestApk();
  return <SignupPage initialRole={initialRole} apkCaption={apkCaption(apk)} />;
}
