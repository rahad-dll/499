"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  IdCard,
  LogOut,
  MapPin,
  Monitor,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { TextField } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { isValidBangladeshPhone, normalizeBangladeshPhone } from "@/lib/auth/phone";
import { describeDevice, sessionsRepository, type DeviceSession } from "@/lib/auth/sessions";
import { ProfileError, profileRepository } from "@/lib/profiles/repository";
import type { MyProfile, UpdateMyProfileInput } from "@/lib/profiles/types";

type ProfileRole = "owner" | "authority";

const ROLE_LABEL: Record<ProfileRole, string> = {
  owner: "Parking Owner",
  authority: "Traffic Authority",
};

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

interface FormState {
  full_name: string;
  phone: string;
  business_name: string;
  address: string;
  organization: string;
  badge_number: string;
}

function formFromProfile(profile: MyProfile): FormState {
  const p = profile.profile;
  return {
    full_name: profile.user.full_name ?? "",
    phone: profile.user.phone ?? "",
    business_name: p.type === "owner" ? p.business_name ?? "" : "",
    address: p.type === "owner" ? p.address ?? "" : "",
    organization: p.type === "authority" ? p.organization ?? "" : "",
    badge_number: p.type === "authority" ? p.badge_number ?? "" : "",
  };
}

const orNull = (value: string) => value.trim() || null;

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PortalProfile({ role }: { role: ProfileRole }) {
  const router = useRouter();
  const { user, logout, refresh } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    profileRepository
      .getMyProfile(controller.signal)
      .then((data) => {
        setProfile(data);
        setForm(formFromProfile(data));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof ProfileError ? error.message : "Could not load your profile.");
      });
    sessionsRepository
      .list()
      .then(setSessions)
      .catch((error: unknown) => {
        setSessionsError(error instanceof Error ? error.message : "Could not load sessions.");
      });
    return () => controller.abort();
  }, []);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setNotice(null);

    if (!form.full_name.trim()) {
      setNotice({ ok: false, text: "Full name is required." });
      return;
    }
    if (!isValidBangladeshPhone(form.phone)) {
      setNotice({ ok: false, text: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)." });
      return;
    }

    const input: UpdateMyProfileInput = {
      full_name: form.full_name.trim(),
      phone: normalizeBangladeshPhone(form.phone),
      ...(role === "owner"
        ? { business_name: orNull(form.business_name), address: orNull(form.address) }
        : { organization: orNull(form.organization), badge_number: orNull(form.badge_number) }),
    };

    setSaving(true);
    try {
      const updated = await profileRepository.updateMyProfile(input);
      setProfile(updated);
      setForm(formFromProfile(updated));
      await refresh(); // update the name shown in the portal header
      setNotice({ ok: true, text: "Profile saved." });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof ProfileError ? error.message : "Could not save your profile." });
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await sessionsRepository.revoke(id);
      setSessions((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Could not sign that device out.");
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  const displayName = profile?.user.full_name?.trim() || user?.full_name?.trim() || ROLE_LABEL[role];
  const roleProfile = profile?.profile;

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* header card */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-card p-5 sm:p-7">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#18d6c0] via-[#26b7e8] to-[#8b6cff]" />
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(145deg,#18d6c0,#26b7e8_55%,#8b6cff)] text-2xl font-extrabold text-white shadow-[0_22px_45px_-18px_rgba(38,183,232,0.9)]">
            {initials(displayName) || <UserRound className="size-9" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-[28px]">{displayName}</h1>
            <p className="truncate text-sm text-muted-foreground">{profile?.user.email ?? user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={role === "owner" ? "info" : "purple"}>{ROLE_LABEL[role]}</Badge>
              {roleProfile?.type === "owner" && (
                <Badge variant={roleProfile.verified ? "success" : "warning"}>
                  {roleProfile.verified ? <BadgeCheck /> : null}
                  {roleProfile.verified ? "Verified owner" : "Verification pending"}
                </Badge>
              )}
              {profile && (
                <Badge variant={profile.user.phone_verified ? "success" : "secondary"}>
                  Phone {profile.user.phone_verified ? "verified" : "not verified"}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* edit form */}
        <SectionCard title="Profile Details" sub="Update the information shown across CityPulse.">
          {!form ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{loadError ? "Profile unavailable." : "Loading profile…"}</div>
          ) : (
            <form onSubmit={onSave}>
              {notice && (
                <Alert variant={notice.ok ? "success" : "destructive"} className="mb-2">
                  <AlertDescription>{notice.text}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-x-5 sm:grid-cols-2">
                <TextField label="Full Name" name="full_name" icon={UserRound} value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required />
                <TextField label="Mobile Number" name="phone" type="tel" icon={Phone} placeholder="01712345678" value={form.phone} onChange={(e) => setField("phone", e.target.value)} required />
                {role === "owner" ? (
                  <>
                    <TextField label="Business Name" name="business_name" icon={Building2} placeholder="Gulshan Parking Ltd." value={form.business_name} onChange={(e) => setField("business_name", e.target.value)} />
                    <TextField label="Business Address" name="address" icon={MapPin} placeholder="House 12, Road 5, Gulshan" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                  </>
                ) : (
                  <>
                    <TextField label="Organization" name="organization" icon={Briefcase} placeholder="Dhaka Metropolitan Police" value={form.organization} onChange={(e) => setField("organization", e.target.value)} />
                    <TextField label="Badge Number" name="badge_number" icon={IdCard} placeholder="DMP-001" value={form.badge_number} onChange={(e) => setField("badge_number", e.target.value)} />
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit" variant="brand" disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </SectionCard>

        <div className="flex flex-col gap-5">
          {/* account facts */}
          <SectionCard title="Account">
            <dl className="flex flex-col gap-3 text-sm">
              {[
                ["Email", profile?.user.email ?? "—"],
                ["Area", profile?.user.area?.name ?? roleProfile?.area?.name ?? "Not set"],
                ["Member since", formatDate(profile?.user.created_at)],
                ["Last login", formatDate(profile?.user.last_login_at)],
                ...(roleProfile?.type === "owner" && roleProfile.verified_at
                  ? [["Verified on", formatDate(roleProfile.verified_at)]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          {/* signed-in devices */}
          <SectionCard title="Signed-in Devices" sub="Sign out sessions you don’t recognise.">
            {sessionsError && <p className="mb-3 text-sm text-destructive">{sessionsError}</p>}
            {!sessions ? (
              <p className="text-sm text-muted-foreground">{sessionsError ? "" : "Loading…"}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {sessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                    <Monitor className="size-4 shrink-0 text-teal-600 dark:text-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{describeDevice(session.device_name)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {session.ip_address ?? "Unknown IP"} · {formatDate(session.created_at)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => revokeSession(session.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Sign out
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Signing out this device here ends your current session.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
