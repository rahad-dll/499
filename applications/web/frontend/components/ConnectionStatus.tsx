"use client";

import { useSyncExternalStore } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/components/loading/useNetworkStatus";
import { slowRequestCount, subscribeSlowRequests } from "@/lib/api/client";

/**
 * Floating notice for the two waits users can't otherwise explain: being
 * offline, and the free API server waking up after a quiet period (requests
 * can then take up to a minute). The live region is always rendered so
 * screen readers announce the message when it appears.
 */
export function ConnectionStatus() {
  const { status } = useNetworkStatus();
  const slow = useSyncExternalStore(subscribeSlowRequests, slowRequestCount, () => 0);

  const message =
    status === "OFFLINE"
      ? {
          icon: <WifiOff className="size-4 shrink-0 text-amber-400" />,
          title: "You're offline",
          text: "Showing the last data we loaded. Live data comes back when you reconnect.",
        }
      : slow > 0
        ? {
            icon: <Loader2 className="size-4 shrink-0 animate-spin text-[#18d6c0] motion-reduce:animate-none" />,
            title: "Waking up the CityPulse server…",
            text: "After a quiet period this can take up to a minute. Thanks for waiting.",
          }
        : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 lg:bottom-6"
    >
      {message && (
        <div className="flex max-w-md items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1324]/95 px-4 py-3 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur">
          <span className="mt-0.5">{message.icon}</span>
          <span>
            <span className="block text-sm font-bold">{message.title}</span>
            <span className="block text-[13px] leading-snug text-slate-300">{message.text}</span>
          </span>
        </div>
      )}
    </div>
  );
}
