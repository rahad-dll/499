export type SpaceType = "indoor" | "outdoor" | "rooftop";
export type SpaceStatus = "active" | "inactive" | "pending";
export type CameraStatus = "active" | "offline" | "setup";
export type SlotStatus = "available" | "not_available" | "unknown";

export type OperatingHours = Record<string, { open: string; close: string }>;

export interface SpaceCamera {
  id: string;
  label?: string | null;
  rtsp_url: string;
  status: CameraStatus;
}

export interface SpacePhoto {
  id: string;
  s3_key: string;
  is_primary: boolean;
}

/** A parking lot as returned by GET /spaces and GET /spaces/:id. */
export interface ParkingSpace {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  area_id?: string | null;
  contact_phone?: string | null;
  latitude: string | number;
  longitude: string | number;
  space_type: SpaceType;
  total_capacity: number;
  operating_hours?: OperatingHours | null;
  amenities?: string[];
  /** Hourly rate in paisa (5000 = ৳50). */
  base_rate_unit?: number | null;
  max_height_cm?: number | null;
  status?: SpaceStatus;
  /** Legacy flag kept for older API builds; prefer `status`. */
  is_active?: boolean;
  cameras?: SpaceCamera[];
  photos?: SpacePhoto[];
  _count?: { slots?: number; bookings?: number };
  created_at?: string;
  updated_at?: string;
}

export interface CreateParkingSpaceInput {
  name: string;
  description?: string;
  address?: string;
  contact_phone?: string;
  latitude: number;
  longitude: number;
  space_type: SpaceType;
  total_capacity: number;
  operating_hours?: OperatingHours;
  amenities?: string[];
  base_rate_unit?: number;
  max_height_cm?: number;
  /** Creates (or replaces) the lot's first camera. */
  rtsp_url?: string;
}

export type UpdateParkingSpaceInput = Partial<CreateParkingSpaceInput>;

export interface SlotStatusInfo {
  slot_id: string;
  status: SlotStatus;
  label: string;
  confidence: number;
  last_updated: string | null;
  is_booked: boolean;
}

/** A lot with live AI occupancy, as returned by the public GET /spaces/nearby. */
export interface NearbySpace {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  total_capacity: number;
  base_rate_unit: number | null;
  amenities: string[];
  status: SpaceStatus;
  distance_km: number;
  available_slots: number;
  occupied_slots: number;
  unknown_slots: number;
  slot_statuses: SlotStatusInfo[];
  is_stale: boolean;
  photo_count: number;
  camera_count: number;
  slot_count: number;
  booking_count: number;
}

/** Result of POST /spaces/:id/infer. */
export interface InferenceResult {
  space_id: string;
  status: SlotStatus;
  label: string;
  confidence: number;
  source: string;
}
