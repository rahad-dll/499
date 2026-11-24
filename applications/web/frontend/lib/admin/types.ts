import type { SpaceStatus, SpaceType } from "@/lib/spaces/types";

/** A parking lot as GET /admin/spaces returns it: every owner's lots. */
export interface AdminSpace {
  id: string;
  name: string;
  address: string | null;
  space_type: SpaceType | null;
  total_capacity: number;
  status: SpaceStatus;
  owner_email: string | null;
  /** slots the owner has marked on the lot */
  slot_count: number;
  created_at: string | null;
}

/** A role from GET /admin/roles. */
export interface AdminRole {
  id: string;
  name: string;
  permissions: string[];
}

/** An account from GET /admin/users. */
export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  role_id: string | null;
  role_name: string | null;
  created_at: string | null;
  last_login_at: string | null;
}
