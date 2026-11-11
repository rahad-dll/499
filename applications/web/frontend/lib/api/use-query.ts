"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  EMPTY_SNAPSHOT,
  isStale,
  loadQuery,
  readQuery,
  subscribeQuery,
  type QuerySnapshot,
} from "./query-store";

export interface QueryOptions {
  /** cached data younger than this is used without a request (default 60 s) */
  staleMs?: number;
  /** keep the key fresh while any component observes it */
  pollMs?: number;
}

export interface QueryResult<T> extends QuerySnapshot<T> {
  /** true until the first load finishes */
  loading: boolean;
  reload: () => Promise<void>;
}

const unsubscribeNothing = () => {};

/**
 * Observes `key` in the shared query store, loading it when missing or stale.
 * Pass `null` as the key to wait (e.g. until the signed-in user is known).
 */
export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { staleMs = 60_000, pollMs }: QueryOptions = {},
): QueryResult<T> {
  // the store may call the loader later (polling), so always use the latest one
  const latest = useRef(fetcher);
  useEffect(() => {
    latest.current = fetcher;
  });
  const load = useCallback(() => latest.current(), []);

  const subscribe = useCallback(
    (notify: () => void) =>
      key
        ? subscribeQuery(key, notify, pollMs ? { everyMs: pollMs, fetcher: load } : undefined)
        : unsubscribeNothing,
    [key, pollMs, load],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (key ? readQuery<T>(key) : EMPTY_SNAPSHOT),
    () => EMPTY_SNAPSHOT,
  );

  useEffect(() => {
    if (key && isStale(key, staleMs)) void loadQuery(key, load);
  }, [key, staleMs, load]);

  const reload = useCallback(() => (key ? loadQuery(key, load) : Promise.resolve()), [key, load]);

  return { ...snapshot, loading: !snapshot.updatedAt && !snapshot.error, reload };
}
