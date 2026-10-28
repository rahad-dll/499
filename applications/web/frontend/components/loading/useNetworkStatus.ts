"use client";

import { useSyncExternalStore } from "react";

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

const readServerStatus = (): NetworkStatus => "FAST"; // SSR: assume the best

/** Change callbacks of every mounted hook, so `refresh()` can force a re-read. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  const connection = getConnection();
  connection?.addEventListener("change", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    connection?.removeEventListener("change", onChange);
  };
}

/** Re-reads the network status now (e.g. from a "Retry" button). */
function refresh() {
  listeners.forEach((onChange) => onChange());
}

/**
 * Tracks the user's connection quality as FAST / MEDIUM / SLOW / OFFLINE,
 * reacting live to online/offline events and `navigator.connection` changes.
 */
export function useNetworkStatus() {
  const status = useSyncExternalStore(subscribe, readStatus, readServerStatus);
  return { status, refresh };
}
