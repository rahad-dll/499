import type { Role } from "@/lib/auth/types";

export interface ProfileArea {
  id: string;
  name: string;
}

export interface ProfileUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string;
  phone_verified: boolean;
  role: Role;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  area: ProfileArea | null;
}

export interface OwnerRoleProfile {
  type: "owner";
  business_name: string | null;
  address: string | null;
  verified: boolean;
  verified_at: string | null;
  area: ProfileArea | null;
}

export interface AuthorityRoleProfile {
  type: "authority";
  organization: string | null;
  badge_number: string | null;
  area: ProfileArea | null;
}

export interface DriverRoleProfile {
  type: "driver";
  area: ProfileArea | null;
}

export type RoleProfile =
  | OwnerRoleProfile
  | AuthorityRoleProfile
  | DriverRoleProfile;

export interface MyProfile {
  user: ProfileUser;
  profile: RoleProfile;
}

export interface UpdateMyProfileInput {
  full_name: string;
  phone: string;
  business_name?: string | null;
  address?: string | null;
  organization?: string | null;
  badge_number?: string | null;
}
