import { ApiError, apiRequest } from "@/lib/api/client";
import { authRepository } from "@/lib/auth/repository";
import type { User } from "@/lib/auth/types";
import { ProfileShapeError, normalizeProfile } from "./normalize";
import type { MyProfile, UpdateMyProfileInput } from "./types";

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly status = 0,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

function profileError(error: unknown): ProfileError {
  if (error instanceof ProfileShapeError) {
    return new ProfileError(
      "The profile API returned data in an unexpected format. Please contact support if this continues.",
    );
  }
  if (!(error instanceof ApiError)) {
    return new ProfileError("Could not load your profile. Please try again.");
  }
  if (error.status === 401) {
    return new ProfileError("Your session has expired. Sign in again to continue.", 401);
  }
  if (error.status === 404) {
    return new ProfileError(
      "We couldn’t find your CityPulse profile. Please contact support if this continues.",
      404,
    );
  }
  return new ProfileError(error.message, error.status);
}

function asAuthUser(profile: MyProfile, cached?: User): User {
  return {
    id: profile.user.id || cached?.id || "",
    email: profile.user.email || cached?.email || "",
    full_name: profile.user.full_name ?? cached?.full_name ?? null,
    role: profile.user.role,
    avatar_url: profile.user.avatar_url ?? cached?.avatar_url ?? null,
    created_at: profile.user.created_at || cached?.created_at || new Date().toISOString(),
  };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<{ payload: T; cached?: User }> {
  const session = await authRepository.getSession();
  if (!session?.token) {
    throw new ProfileError("Your session has expired. Sign in again to continue.", 401);
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  const payload = await apiRequest<T>(path, { ...init, headers });
  return { payload, cached: session.user };
}

async function fetchProfile(signal?: AbortSignal): Promise<MyProfile> {
  const { payload, cached } = await call<unknown>("/profiles/me", { signal });
  let profile: MyProfile;
  try {
    profile = normalizeProfile(payload, cached ?? {});
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Unexpected GET /profiles/me response", payload);
    }
    throw error;
  }
  authRepository.updateCachedUser(asAuthUser(profile, cached));
  return profile;
}

async function wrap<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ProfileError) throw error;
    throw profileError(error);
  }
}

export const profileRepository = {
  /** GET /profiles/me (any documented or legacy response shape). */
  getMyProfile(signal?: AbortSignal): Promise<MyProfile> {
    return wrap(() => fetchProfile(signal));
  },

  /** PATCH /profiles/me, then re-read so the result is always normalized. */
  updateMyProfile(input: UpdateMyProfileInput): Promise<MyProfile> {
    return wrap(async () => {
      await call<unknown>("/profiles/me", { method: "PATCH", body: JSON.stringify(input) });
      return fetchProfile();
    });
  },
};
