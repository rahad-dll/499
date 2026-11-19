"use client";

import { useSyncExternalStore } from "react";

/* One shared one-second ticker for every live "x s ago" label on the page. */

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(onTick: () => void): () => void {
  listeners.add(onTick);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 1_000);
  }
  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The current time, updated every second; 0 during server rendering. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
