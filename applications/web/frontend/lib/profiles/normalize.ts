/**
 * The deployed API's GET /profiles/me does not document its response, and it
 * differs from the `{ user, profile }` shape the local backend returns. This
 * turns any of the common shapes into `MyProfile`:
 *
 *  A. `{ user: {...}, profile: { type, ... } }`
 *  B. a user row with relations: `{ id, email, role: "owner" | { name }, owner_profile: {...} }`
 *  C. a role-profile row with its user: `{ organization, ..., user: { id, email, ... } }`
 *  D. any of the above wrapped in `{ data: ... }`
 *
 * Only type imports are used so Node's test runner can load this file.
 */
import type { Role } from "@/lib/auth/types";
import type { MyProfile, ProfileArea, ProfileUser, RoleProfile } from "./types";

type Obj = Record<string, unknown>;

const ROLES: Role[] = ["driver", "owner", "authority"];

const isObj = (value: unknown): value is Obj =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

function roleOf(value: unknown): Role | null {
  const name = typeof value === "string" ? value : isObj(value) ? value.name : null;
  return ROLES.includes(name as Role) ? (name as Role) : null;
}

function areaOf(value: unknown): ProfileArea | null {
  return isObj(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name }
    : null;
}

function firstObj(...candidates: unknown[]): Obj | undefined {
  return candidates.find(isObj);
}

export class ProfileShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileShapeError";
  }
}

export function normalizeProfile(
  payload: unknown,
  fallback: { id?: string; email?: string; role?: Role; full_name?: string | null } = {},
): MyProfile {
  let raw = payload;
  if (isObj(raw) && isObj(raw.data) && !raw.user && !raw.email) raw = raw.data;
  if (!isObj(raw)) throw new ProfileShapeError("Profile response is not an object");

  // the object that holds account fields (email, phone, ...)
  const account: Obj = !text(raw.email) && isObj(raw.user) ? raw.user : raw;

  const role =
    roleOf(account.role) ??
    roleOf(raw.role) ??
    roleOf(isObj(raw.profile) ? raw.profile.type : null) ??
    fallback.role ??
    null;
  if (!role) throw new ProfileShapeError("Profile response has no role");

  // the object that holds role fields (business_name, organization, ...)
  const details: Obj =
    firstObj(
      raw.profile,
      raw[`${role}_profile`],
      account[`${role}_profile`],
      raw.role_profile,
      account !== raw ? raw : undefined,
    ) ?? account;

  const user: ProfileUser = {
    id: text(account.id) ?? text(details.user_id) ?? fallback.id ?? "",
    email: text(account.email) ?? fallback.email ?? "",
    full_name: text(account.full_name) ?? text(details.full_name) ?? fallback.full_name ?? null,
    phone: text(account.phone) ?? "",
    phone_verified: account.phone_verified === true,
    role,
    avatar_url: text(account.avatar_url),
    is_active: account.is_active !== false,
    last_login_at: text(account.last_login_at),
    created_at: text(account.created_at) ?? "",
    updated_at: text(account.updated_at) ?? "",
    area: areaOf(account.area),
  };

  let profile: RoleProfile;
  if (role === "owner") {
    profile = {
      type: "owner",
      business_name: text(details.business_name),
      address: text(details.address),
      verified: details.verified === true,
      verified_at: text(details.verified_at),
      area: areaOf(details.area),
    };
  } else if (role === "authority") {
    profile = {
      type: "authority",
      organization: text(details.organization),
      badge_number: text(details.badge_number),
      area: areaOf(details.area),
    };
  } else {
    profile = { type: "driver", area: areaOf(details.area) };
  }

  return { user, profile };
}
