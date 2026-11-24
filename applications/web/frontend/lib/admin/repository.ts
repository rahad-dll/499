import { asList, authedRequest } from "@/lib/api/authed";
import { invalidateQuery } from "@/lib/api/query-store";
import type { SpaceStatus, SpaceType } from "@/lib/spaces/types";
import type { AdminRole, AdminSpace, AdminUser } from "./types";

/** Query-store keys for the admin portal. */
export const adminKeys = {
  spaces: "admin:spaces",
  users: "admin:users",
  roles: "admin:roles",
};

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => !!value && typeof value === "object";
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;
const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const STATUSES: SpaceStatus[] = ["active", "inactive", "pending"];
const SPACE_TYPES: SpaceType[] = ["indoor", "outdoor", "rooftop"];

/* The admin endpoints return raw database rows. These pick the fields the
   portal shows and nothing else (a user row carries its password hash). */

function toAdminSpace(row: Row): AdminSpace {
  const owner = isRow(row.owner) ? row.owner : {};
  const counts = isRow(row._count) ? row._count : {};
  return {
    id: String(row.id),
    name: text(row.name) ?? "Unnamed lot",
    address: text(row.address),
    space_type: SPACE_TYPES.find((type) => type === row.space_type) ?? null,
    total_capacity: count(row.total_capacity),
    status: STATUSES.find((status) => status === row.status) ?? "pending",
    owner_email: text(owner.email),
    slot_count: count(counts.slots),
    created_at: text(row.created_at),
  };
}

function toAdminUser(row: Row): AdminUser {
  const role = isRow(row.role) ? row.role : {};
  return {
    id: String(row.id),
    email: text(row.email) ?? "",
    full_name: text(row.full_name),
    phone: text(row.phone),
    is_active: row.is_active !== false,
    role_id: text(row.role_id) ?? text(role.id),
    role_name: text(role.name),
    created_at: text(row.created_at),
    last_login_at: text(row.last_login_at),
  };
}

function toAdminRole(row: Row): AdminRole {
  const permissions = Array.isArray(row.permissions) ? row.permissions : [];
  return {
    id: String(row.id),
    name: text(row.name) ?? "",
    permissions: permissions
      .map((entry) => (isRow(entry) && isRow(entry.permission) ? text(entry.permission.name) : null))
      .filter((name): name is string => name !== null),
  };
}

async function rows(path: string): Promise<Row[]> {
  return asList<unknown>(await authedRequest<unknown>(path)).filter(isRow);
}

/** The admin-only endpoints of the CityPulse API (`/admin/*`). */
export const adminRepository = {
  /** GET /admin/spaces: every owner's lots, newest first. */
  async listSpaces(): Promise<AdminSpace[]> {
    return (await rows("/admin/spaces")).map(toAdminSpace);
  },

  /** PATCH /admin/spaces/:id/status: approve (`active`), suspend (`inactive`) or reset (`pending`). */
  async setSpaceStatus(id: string, status: SpaceStatus): Promise<void> {
    await authedRequest<unknown>(`/admin/spaces/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    invalidateQuery(adminKeys.spaces);
  },

  /** GET /admin/users: every account, newest first. */
  async listUsers(): Promise<AdminUser[]> {
    return (await rows("/admin/users")).map(toAdminUser);
  },

  /** GET /admin/roles: the roles an account can be given. */
  async listRoles(): Promise<AdminRole[]> {
    return (await rows("/admin/roles")).map(toAdminRole);
  },

  /** PATCH /admin/users/:id/role: applies from the user's next sign-in or token refresh. */
  async assignRole(userId: string, roleId: string): Promise<void> {
    await authedRequest<unknown>(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role_id: roleId }),
    });
    invalidateQuery(adminKeys.users);
  },
};
