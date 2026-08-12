"use client";

import { PortalProfile } from "@/components/profile/PortalProfile";
import { AuthorityShell } from "@/components/portal/AuthorityShell";

export default function AuthorityProfilePage() {
  return (
    <AuthorityShell active="profile">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <PortalProfile role="authority" />
      </main>
    </AuthorityShell>
  );
}
