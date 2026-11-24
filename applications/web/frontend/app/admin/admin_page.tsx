"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  MapPin,
  ParkingCircle,
  RefreshCcw,
  Search,
  SearchX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminShell } from "@/components/portal/AdminShell";
import { RowsSkeleton } from "@/components/portal/PageSkeleton";
import { LOT_STATUS } from "@/components/portal/owner-widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { adminKeys, adminRepository } from "@/lib/admin/repository";
import type { AdminRole, AdminSpace, AdminUser } from "@/lib/admin/types";
import { useQuery } from "@/lib/api/use-query";
import { formatDate } from "@/lib/format/datetime";
import type { SpaceStatus } from "@/lib/spaces/types";
import { cn } from "@/lib/utils";

const NO_SPACES: AdminSpace[] = [];
const NO_USERS: AdminUser[] = [];
const NO_ROLES: AdminRole[] = [];

/** Users shown at first, and added by each "Show more". */
const USERS_PAGE = 25;

type LotFilter = SpaceStatus | "all";

const LOT_FILTERS: { key: LotFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "active", label: "Approved" },
  { key: "inactive", label: "Suspended" },
  { key: "all", label: "All" },
];

const LOT_COLUMNS = ["Parking lot", "Owner", "Slots", "Registered", "Status", "Actions"];
const USER_COLUMNS = ["User", "Phone", "Role", "Account", "Joined"];

const ROLE_BADGE: Record<string, "info" | "success" | "purple" | "secondary"> = {
  admin: "info",
  owner: "success",
  authority: "purple",
  driver: "secondary",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function matches(query: string, ...fields: (string | null)[]): boolean {
  const needle = query.trim().toLowerCase();
  return !needle || fields.some((field) => field?.toLowerCase().includes(needle));
}

/* ---------------- shared pieces ---------------- */

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
            value === option.key
              ? "bg-brand/10 text-teal-600 dark:text-brand"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-bold text-muted-foreground">
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SearchBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl bg-muted pl-9 text-sm"
      />
    </div>
  );
}

function ErrorBox({ children }: { children: string }) {
  return (
    <div role="alert" className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {children}
    </div>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/60 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {columns.map((column) => (
          <th key={column} className="px-5 py-3.5 font-bold">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/* ---------------- parking lots ---------------- */

function LotStatus({ status }: { status: SpaceStatus }) {
  const meta = LOT_STATUS[status];
  return (
    <Badge variant={meta.variant} title={meta.detail}>
      <span className="size-1.5 rounded-full bg-current" />
      {status === "active" ? "Approved" : status === "pending" ? "Pending" : "Suspended"}
    </Badge>
  );
}

/** The status changes an admin can make from each state. */
function LotActions({
  space,
  busy,
  onChange,
}: {
  space: AdminSpace;
  busy: boolean;
  onChange: (space: AdminSpace, status: SpaceStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {space.status !== "active" && (
        <Button size="sm" variant="brand" disabled={busy} onClick={() => onChange(space, "active")}>
          <CheckCircle2 />
          {busy ? "Saving…" : space.status === "pending" ? "Approve" : "Reactivate"}
        </Button>
      )}
      {space.status !== "inactive" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onChange(space, "inactive")}>
          <Ban />
          {space.status === "pending" ? "Decline" : "Suspend"}
        </Button>
      )}
    </div>
  );
}

function LotsSection({
  spaces,
  loading,
  error,
}: {
  spaces: AdminSpace[];
  loading: boolean;
  error: string | null;
}) {
  const [filter, setFilter] = useState<LotFilter>("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byStatus: Record<LotFilter, number> = { pending: 0, active: 0, inactive: 0, all: spaces.length };
    for (const space of spaces) byStatus[space.status] += 1;
    return byStatus;
  }, [spaces]);

  const visible = spaces.filter(
    (space) =>
      (filter === "all" || space.status === filter) &&
      matches(query, space.name, space.address, space.owner_email),
  );

  async function changeStatus(space: AdminSpace, status: SpaceStatus) {
    if (
      status === "inactive" &&
      !window.confirm(
        space.status === "pending"
          ? `Decline “${space.name}”? It stays hidden from drivers.`
          : `Suspend “${space.name}”? Drivers will no longer be able to find or book it.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setBusyId(space.id);
    try {
      await adminRepository.setSpaceStatus(space.id, status);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the parking lot.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="lots-heading" className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="lots-heading" className="text-lg font-extrabold tracking-tight">Parking lot approvals</h2>
          <p className="text-[13px] text-muted-foreground">
            Drivers can find and book a lot only after it is approved.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <FilterPills
            label="Filter lots by status"
            value={filter}
            onChange={setFilter}
            options={LOT_FILTERS.map((option) => ({ ...option, count: loading || error ? undefined : counts[option.key] }))}
          />
          <SearchBox label="Search lots or owners" value={query} onChange={setQuery} />
        </div>
      </div>

      {actionError && <ErrorBox>{actionError}</ErrorBox>}

      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : loading ? (
        <LoadingRegion label="Loading parking lots…" className="mt-4 rounded-2xl border border-border">
          <RowsSkeleton />
        </LoadingRegion>
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={query ? SearchX : filter === "pending" ? CheckCircle2 : ParkingCircle}
          title={
            query
              ? "No lots match your search"
              : filter === "pending"
                ? "No lots waiting for approval"
                : "No parking lots here"
          }
          description={
            query
              ? "Try a different lot name, address or owner email."
              : filter === "pending"
                ? "New lots appear here as soon as an owner registers one."
                : undefined
          }
          action={
            query ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* table on ≥lg */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border lg:block">
            <table className="w-full text-left text-sm">
              <TableHead columns={LOT_COLUMNS} />
              <tbody>
                {visible.map((space) => (
                  <tr key={space.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="max-w-72 px-5 py-4">
                      <div className="truncate font-bold">{space.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{space.address ?? "No address"}</div>
                    </td>
                    <td className="max-w-56 truncate px-5 py-4 text-muted-foreground">{space.owner_email ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold">{space.total_capacity}</div>
                      <div className="text-xs text-muted-foreground">{space.slot_count} marked</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatDate(space.created_at)}</td>
                    <td className="px-5 py-4">
                      <LotStatus status={space.status} />
                    </td>
                    <td className="px-5 py-4">
                      <LotActions space={space} busy={busyId === space.id} onChange={changeStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* cards below lg */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">
            {visible.map((space) => (
              <article key={space.id} className="flex flex-col rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate font-bold">{space.name}</h3>
                  <LotStatus status={space.status} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{space.address ?? "No address"}</span>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd className="truncate font-semibold">{space.owner_email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Slots</dt>
                    <dd className="font-semibold">{space.total_capacity} ({space.slot_count} marked)</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registered</dt>
                    <dd className="font-semibold">{formatDate(space.created_at)}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <LotActions space={space} busy={busyId === space.id} onChange={changeStatus} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- users ---------------- */

function RoleBadge({ name }: { name: string | null }) {
  if (!name) return <Badge variant="outline">No role</Badge>;
  return <Badge variant={ROLE_BADGE[name] ?? "outline"}>{capitalize(name)}</Badge>;
}

/** The role as a dropdown when it can be changed here, otherwise as a badge. */
function RoleControl({
  account,
  roles,
  locked,
  busy,
  onChange,
}: {
  account: AdminUser;
  roles: AdminRole[];
  /** the signed-in admin's own row */
  locked: boolean;
  busy: boolean;
  onChange: (account: AdminUser, role: AdminRole) => void;
}) {
  if (locked || roles.length === 0 || !account.role_id) return <RoleBadge name={account.role_name} />;
  return (
    <select
      aria-label={`Role of ${account.email}`}
      value={account.role_id}
      disabled={busy}
      onChange={(e) => {
        const role = roles.find((candidate) => candidate.id === e.target.value);
        if (role) onChange(account, role);
      }}
      className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {capitalize(role.name)}
        </option>
      ))}
    </select>
  );
}

/** Name over email; most accounts have no name in the API, so the email leads then. */
function AccountName({ account, isMe }: { account: AdminUser; isMe: boolean }) {
  const you = isMe && <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>;
  if (!account.full_name) {
    return <div className="truncate font-bold">{account.email}{you}</div>;
  }
  return (
    <>
      <div className="truncate font-bold">{account.full_name}{you}</div>
      <div className="truncate text-xs text-muted-foreground">{account.email}</div>
    </>
  );
}

function AccountBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      <span className="size-1.5 rounded-full bg-current" />
      {active ? "Active" : "Disabled"}
    </Badge>
  );
}

function UsersSection({
  users,
  roles,
  loading,
  error,
}: {
  users: AdminUser[];
  roles: AdminRole[];
  loading: boolean;
  error: string | null;
}) {
  const { user: me } = useAuth();
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(USERS_PAGE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    const byRole = new Map<string, number>();
    for (const account of users) {
      if (account.role_name) byRole.set(account.role_name, (byRole.get(account.role_name) ?? 0) + 1);
    }
    return [
      { key: "all", label: "All", count: users.length },
      ...[...byRole].map(([name, total]) => ({ key: name, label: capitalize(name), count: total })),
    ];
  }, [users]);

  const filtered = users.filter(
    (account) =>
      (roleFilter === "all" || account.role_name === roleFilter) &&
      matches(query, account.full_name, account.email, account.phone),
  );
  const visible = filtered.slice(0, shown);

  async function changeRole(account: AdminUser, role: AdminRole) {
    if (role.id === account.role_id) return;
    const ok = window.confirm(
      `Change ${account.email} from ${account.role_name ?? "no role"} to ${role.name}? ` +
        "It applies the next time they sign in.",
    );
    if (!ok) return;
    setActionError(null);
    setBusyId(account.id);
    try {
      await adminRepository.assignRole(account.id, role.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change the role.");
    } finally {
      setBusyId(null);
    }
  }

  const roleControl = (account: AdminUser) => (
    <RoleControl
      account={account}
      roles={roles}
      locked={account.id === me?.id}
      busy={busyId === account.id}
      onChange={changeRole}
    />
  );

  return (
    <section aria-labelledby="users-heading" className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="users-heading" className="text-lg font-extrabold tracking-tight">Users</h2>
          <p className="text-[13px] text-muted-foreground">
            Every CityPulse account. A role change applies at the user&apos;s next sign-in.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <FilterPills
            label="Filter users by role"
            value={roleFilter}
            onChange={(key) => {
              setRoleFilter(key);
              setShown(USERS_PAGE);
            }}
            options={loading || error ? [{ key: "all", label: "All" }] : roleOptions}
          />
          <SearchBox
            label="Search name, email or phone"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setShown(USERS_PAGE);
            }}
          />
        </div>
      </div>

      {actionError && <ErrorBox>{actionError}</ErrorBox>}

      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : loading ? (
        <LoadingRegion label="Loading users…" className="mt-4 rounded-2xl border border-border">
          <RowsSkeleton />
        </LoadingRegion>
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={query ? SearchX : Users}
          title={query ? "No users match your search" : "No users here"}
          description={query ? "Try a different name, email or phone number." : undefined}
          action={
            query ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* table on ≥lg */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border lg:block">
            <table className="w-full text-left text-sm">
              <TableHead columns={USER_COLUMNS} />
              <tbody>
                {visible.map((account) => (
                  <tr key={account.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="max-w-80 px-5 py-4">
                      <AccountName account={account} isMe={account.id === me?.id} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{account.phone ?? "—"}</td>
                    <td className="px-5 py-4">{roleControl(account)}</td>
                    <td className="px-5 py-4">
                      <AccountBadge active={account.is_active} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatDate(account.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* cards below lg */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">
            {visible.map((account) => (
              <article key={account.id} className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <AccountName account={account} isMe={account.id === me?.id} />
                  </div>
                  <AccountBadge active={account.is_active} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{account.phone ?? "No phone"} · joined {formatDate(account.created_at)}</span>
                  {roleControl(account)}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
            <span>
              Showing {visible.length} of {filtered.length} user{filtered.length === 1 ? "" : "s"}
            </span>
            {filtered.length > visible.length && (
              <Button variant="outline" size="sm" onClick={() => setShown((n) => n + USERS_PAGE)}>
                Show more
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------- page ---------------- */

interface Metric {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  label: string;
  caption: string;
  loading: boolean;
}

function AdminOverview() {
  const spacesQuery = useQuery(adminKeys.spaces, adminRepository.listSpaces);
  const usersQuery = useQuery(adminKeys.users, adminRepository.listUsers);
  const rolesQuery = useQuery(adminKeys.roles, adminRepository.listRoles, { staleMs: 5 * 60_000 });

  const spaces = spacesQuery.data ?? NO_SPACES;
  const users = usersQuery.data ?? NO_USERS;
  const roles = rolesQuery.data ?? NO_ROLES;
  const [refreshing, setRefreshing] = useState(false);

  const metrics = useMemo<Metric[]>(() => {
    const lots = (status: SpaceStatus) => spaces.filter((space) => space.status === status).length;
    const accounts = (role: string) => users.filter((account) => account.role_name === role).length;
    const lotValue = (status: SpaceStatus) => (spacesQuery.error ? "—" : lots(status).toLocaleString());
    return [
      {
        icon: Clock3,
        iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        value: lotValue("pending"),
        label: "Pending approval",
        caption: "Lots waiting for your review",
        loading: spacesQuery.loading,
      },
      {
        icon: CheckCircle2,
        iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        value: lotValue("active"),
        label: "Approved lots",
        caption: "Bookable in the driver app",
        loading: spacesQuery.loading,
      },
      {
        icon: Ban,
        iconClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
        value: lotValue("inactive"),
        label: "Suspended lots",
        caption: "Hidden from drivers",
        loading: spacesQuery.loading,
      },
      {
        icon: Users,
        iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        value: usersQuery.error ? "—" : users.length.toLocaleString(),
        label: "Users",
        caption: usersQuery.error
          ? "Users unavailable"
          : `Drivers ${accounts("driver")} · Owners ${accounts("owner")} · Authorities ${accounts("authority")}`,
        loading: usersQuery.loading,
      },
    ];
  }, [spaces, users, spacesQuery.error, spacesQuery.loading, usersQuery.error, usersQuery.loading]);

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([spacesQuery.reload(), usersQuery.reload(), rolesQuery.reload()]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Admin overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve parking lots and manage CityPulse accounts.
          </p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCcw className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-4 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <span className={cn("flex size-10 items-center justify-center rounded-xl", m.iconClass)}>
              <m.icon className="size-5" />
            </span>
            {m.loading ? (
              <Skeleton className="mt-3 h-8 w-20" />
            ) : (
              <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[28px]">{m.value}</div>
            )}
            <div className="mt-0.5 text-[13px] font-semibold">{m.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{m.caption}</div>
          </div>
        ))}
      </div>

      <LotsSection spaces={spaces} loading={spacesQuery.loading} error={spacesQuery.error} />
      <UsersSection users={users} roles={roles} loading={usersQuery.loading} error={usersQuery.error} />
    </>
  );
}

export default function AdminPage() {
  return (
    <AdminShell active="overview">
      <AdminOverview />
    </AdminShell>
  );
}
