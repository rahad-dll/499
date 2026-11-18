import { spaceStatus } from "@/lib/insights/metrics";
import type { ParkingSpace } from "./types";

/** A lot as the API sends it: Prisma decimals arrive as strings, older builds only send `is_active`. */
export type ApiParkingSpace = Omit<ParkingSpace, "latitude" | "longitude"> & {
  latitude: string | number;
  longitude: string | number;
};

/** Adapter: converts an API lot into the shape the UI uses, once, when it arrives. */
export function toParkingSpace(raw: ApiParkingSpace): ParkingSpace {
  return {
    ...raw,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    status: spaceStatus(raw),
  };
}
