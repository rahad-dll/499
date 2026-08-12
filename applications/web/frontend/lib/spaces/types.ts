export type SpaceType = "indoor" | "outdoor" | "rooftop";

export interface ParkingSpace {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  contact_phone?: string | null;
  latitude: string | number;
  longitude: string | number;
  space_type: SpaceType;
  total_capacity: number;
  base_rate_unit?: number | null;
  max_height_cm?: number | null;
  rtsp_url?: string | null;
  is_active?: boolean;
  created_at?: string;
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
  base_rate_unit?: number;
  max_height_cm?: number;
  rtsp_url?: string;
}
