import { asList, authedRequest } from "@/lib/api/authed";

/** An active sign-in, as returned by GET /auth/sessions. */
export interface DeviceSession {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

export const sessionsRepository = {
  /** GET /auth/sessions: the signed-in user's active sessions. */
  async list(): Promise<DeviceSession[]> {
    return asList<DeviceSession>(await authedRequest<unknown>("/auth/sessions"));
  },

  /** DELETE /auth/sessions/:id: sign a device out. */
  async revoke(id: string): Promise<void> {
    await authedRequest<unknown>(`/auth/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

/** Turns a raw user-agent string into a short "Chrome on Windows" label. */
export function describeDevice(deviceName: string | null): string {
  if (!deviceName) return "Unknown device";
  if (!deviceName.includes("Mozilla/")) return deviceName;
  const browser =
    /Edg\//.test(deviceName) ? "Edge"
    : /OPR\//.test(deviceName) ? "Opera"
    : /Chrome\//.test(deviceName) ? "Chrome"
    : /Firefox\//.test(deviceName) ? "Firefox"
    : /Safari\//.test(deviceName) ? "Safari"
    : "Browser";
  const os =
    /Windows/.test(deviceName) ? "Windows"
    : /Android/.test(deviceName) ? "Android"
    : /iPhone|iPad/.test(deviceName) ? "iOS"
    : /Mac OS X/.test(deviceName) ? "macOS"
    : /Linux/.test(deviceName) ? "Linux"
    : "Unknown OS";
  return `${browser} on ${os}`;
}
