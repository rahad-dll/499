"use client";

import { useCallback, useEffect, useState } from "react";

export type NetworkStatus = "FAST" | "MEDIUM" | "SLOW" | "OFFLINE";

interface NetworkInformation extends EventTarget {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function readStatus(): NetworkStatus {
  if (typeof navigator === "undefined") return "FAST"; // SSR: assume the best
  if (!navigator.onLine) return "OFFLINE";

  switch (getConnection()?.effectiveType) {
    case "slow-2g":
    case "2g":
      return "SLOW";
    case "3g":
      return "MEDIUM";
    case "4g":
    default:
      // No Network Information API (Firefox/Safari) → treat as fast
      return "FAST";
  }
}

/**
 * Tracks the user's connection quality as FAST / MEDIUM / SLOW / OFFLINE,
 * reacting live to online/offline events and `navigator.connection` changes.
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>("FAST");

  const refresh = useCallback(() => setStatus(readStatus()), []);

  useEffect(() => {
    refresh();

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const connection = getConnection();
    connection?.addEventListener("change", refresh);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      connection?.removeEventListener("change", refresh);
    };
  }, [refresh]);

  return { status, refresh };
}
