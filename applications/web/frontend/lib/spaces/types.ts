export type SpaceType = "indoor" | "outdoor" | "rooftop";
/**
 * Admin approval state of a lot: `pending` until a CityPulse admin approves it,
 * `active` once approved (drivers can book it), `inactive` when suspended.
 * Only an admin can change it (PATCH /admin/spaces/:id/status); the API has no
 * owner-controlled open/closed setting.
 */
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
  /** "local" for photos kept on the API server's disk (GET /spaces/:id only) */
  s3_bucket?: string;
}

/**
 * A parking lot from GET /spaces and GET /spaces/:id, after `toParkingSpace`
 * (lib/spaces/adapters.ts) has normalized it.
 */
export interface ParkingSpace {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  area_id?: string | null;
  contact_phone?: string | null;
  latitude: number;
  longitude: number;
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

/** Vehicle types the web wizard offers (a subset of the API's `VehicleKind`). */
export type VehicleType = "car" | "motorcycle" | "cng" | "microbus" | "bicycle" | "truck";

/** Every vehicle type the API accepts for slots and rates. */
export type ApiVehicleType = VehicleType | "suv" | "pickup";

/** A slot rectangle in the camera frame's pixels (origin top-left). */
export interface SlotBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One slot in POST/PATCH /spaces/:spaceId/cameras (`CameraSlotDto`). */
export interface CameraSlotInput {
  /** 1-20 letters, digits or "-"; unique in the lot, stored upper case */
  slot_label: string;
  vehicle_type: ApiVehicleType;
  /** own hourly price in paisa; omit to use the lot's rate for the vehicle type */
  hourly_rate_unit?: number;
  bbox: SlotBoundingBox;
}

/** Body of POST /spaces/:spaceId/cameras (`CreateCameraDto`). */
export interface CreateCameraInput {
  label: string;
  source_type: "rtsp" | "video";
  /** required for rtsp cameras */
  rtsp_url?: string | null;
  /** native pixel size of the footage the boxes are drawn on */
  frame_width: number;
  frame_height: number;
  slots?: CameraSlotInput[];
}

/** Body of PATCH /spaces/:spaceId/cameras/:cameraId: slots are matched by label. */
export type UpdateCameraInput = Partial<CreateCameraInput>;

/** A slot as GET /spaces/:spaceId/cameras returns it (boxes in frame pixels). */
export interface CameraSlot {
  id: string;
  camera_id: string;
  slot_label: string;
  vehicle_type: ApiVehicleType | null;
  hourly_rate_unit: number | null;
  bbox: SlotBoundingBox | null;
  status: "active" | "inactive" | "maintenance" | "blocked";
  occupied: boolean;
  confidence_score: number | null;
  last_updated: string | null;
}

/** A camera with its slots, from the cameras endpoints. */
export interface CameraDetail {
  id: string;
  space_id: string;
  label: string | null;
  source_type: "rtsp" | "video";
  rtsp_url: string | null;
  frame_width: number | null;
  frame_height: number | null;
  status: CameraStatus;
  slots: CameraSlot[];
}

/** The lot's hourly rate for one vehicle type (paisa). */
export interface VehicleRate {
  vehicle_type: ApiVehicleType;
  hourly_rate_unit: number;
}

/** GET /spaces/:spaceId/cameras */
export interface SpaceCameras {
  space_id: string;
  vehicle_rates: VehicleRate[];
  cameras: CameraDetail[];
}

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
