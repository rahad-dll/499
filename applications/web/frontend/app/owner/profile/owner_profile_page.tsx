"use client";

import { PortalProfile } from "@/components/profile/PortalProfile";
import { OwnerShell } from "@/components/portal/OwnerShell";

export default function OwnerProfilePage() {
  return (
    <OwnerShell active="profile" breadcrumb="Profile">
      <PortalProfile role="owner" />
    </OwnerShell>
  );
}

