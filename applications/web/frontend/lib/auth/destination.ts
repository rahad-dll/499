import type { Role } from "./types";

export type DriverHandoffSource = "login" | "signup";

/**
 * Returns the first authenticated destination for a CityPulse role.
 *
 * The optional source is only meaningful for drivers because their web route
 * is a handoff screen rather than an operational dashboard.
 */
export function roleDestination(
  role: Role,
  source?: DriverHandoffSource,
): string {
  if (role === "owner") return "/owner";
  if (role === "authority") return "/command-center";
  return source ? `/driver-app?source=${source}` : "/driver-app";
}
