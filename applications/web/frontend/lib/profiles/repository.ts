import { ApiError, apiRequest } from "@/lib/api/client";
import { authRepository } from "@/lib/auth/repository";
import type { User } from "@/lib/auth/types";
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

function asAuthUser(profile: MyProfile): User {
  return {
    id: profile.user.id,
    email: profile.user.email,
    full_name: profile.user.full_name,
    role: profile.user.role,
    avatar_url: profile.user.avatar_url,
    created_at: profile.user.created_at,
  };
}

async function bearerToken(): Promise<string> {
  const token = await authRepository.getAccessToken();
  if (!token) {
    throw new ProfileError("Your session has expired. Sign in again to continue.", 401);
  }
  return token;
}

async function requestProfile(
  init: RequestInit = {},
): Promise<MyProfile> {
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await bearerToken()}`);
    const profile = await apiRequest<MyProfile>("/profiles/me", {
      ...init,
      headers,
    });
    authRepository.updateCachedUser(asAuthUser(profile));
    return profile;
  } catch (error) {
    if (error instanceof ProfileError) throw error;
    throw profileError(error);
  }
}

export const profileRepository = {
  getMyProfile(signal?: AbortSignal): Promise<MyProfile> {
    return requestProfile({ signal });
  },

  updateMyProfile(input: UpdateMyProfileInput): Promise<MyProfile> {
    return requestProfile({
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
