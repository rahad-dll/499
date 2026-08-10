import { ApiError, apiRequest } from "@/lib/api/client";
import { authRepository } from "@/lib/auth/repository";
import type { CreateParkingSpaceInput, ParkingSpace } from "./types";

export class ParkingSpaceError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = "ParkingSpaceError";
  }
}

async function authorizationHeaders(): Promise<HeadersInit> {
  const token = await authRepository.getAccessToken();
  if (!token) throw new ParkingSpaceError("Please log in again.", 401);
  return { Authorization: `Bearer ${token}` };
}

function spaceError(error: unknown, fallback: string): ParkingSpaceError {
  if (error instanceof ParkingSpaceError) return error;
  if (error instanceof ApiError) return new ParkingSpaceError(error.message, error.status);
  return new ParkingSpaceError(fallback);
}

export const parkingSpacesRepository = {
  async list(): Promise<ParkingSpace[]> {
    try {
      return await apiRequest<ParkingSpace[]>("/spaces", {
        headers: await authorizationHeaders(),
      });
    } catch (error) {
      throw spaceError(error, "Could not load parking lots");
    }
  },

  async create(input: CreateParkingSpaceInput): Promise<ParkingSpace> {
    try {
      return await apiRequest<ParkingSpace>("/spaces", {
        method: "POST",
        headers: await authorizationHeaders(),
        body: JSON.stringify(input),
      });
    } catch (error) {
      throw spaceError(error, "Could not register parking lot");
    }
  },
};
