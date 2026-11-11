/**
 * A small cache shared by every component in the browser tab.
 *
 * - Singleton: one module-level `Map`, so loaded data outlives page navigation.
 * - Observer: components subscribe to a key and are told when its data changes.
 * - Single-flight: callers that load the same key at the same time share one request.
 * - Polling runs only while someone observes a key, pauses in hidden tabs,
 *   and backs off after failures.
 *
 * It has no React dependency; `use-query.ts` binds it to components.
 */

export interface QuerySnapshot<T> {
  data: T | undefined;
  error: string | null;
  /** epoch ms of the last successful load; 0 = never loaded */
  updatedAt: number;
}

export interface PollOptions {
  everyMs: number;
  fetcher: () => Promise<unknown>;
}

type Listener = () => void;

interface Entry {
  snapshot: QuerySnapshot<unknown>;
  listeners: Set<Listener>;
  inflight?: Promise<void>;
  /** the latest loader, so invalidation and polling can reload the key */
  fetcher?: () => Promise<unknown>;
  /** the error behind `snapshot.error`, for callers that rethrow it */
  lastError?: unknown;
  /** set by `invalidateQuery`; the data is kept until a reload replaces it */
  invalidated: boolean;
  /** bumped on every invalidation, so a load that started earlier can't clear it */
  version: number;
  /** epoch ms of the last invalidation */
  invalidatedAt: number;
  /** epoch ms the last load finished, successful or not */
  attemptedAt: number;
  failures: number;
  poll?: { everyMs: number; timer?: ReturnType<typeof setTimeout> };
}

export const EMPTY_SNAPSHOT: QuerySnapshot<never> = Object.freeze({
  data: undefined,
  error: null,
  updatedAt: 0,
});

/** Longest wait between polls after repeated failures. */
const MAX_BACKOFF_MS = 5 * 60_000;

const entries = new Map<string, Entry>();
/** bumped by `clearQueries`, so loads from before a sign-out are dropped */
let generation = 0;
let watchingVisibility = false;

function entryFor(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = {
      snapshot: EMPTY_SNAPSHOT,
      listeners: new Set(),
      invalidated: false,
      version: 0,
      invalidatedAt: 0,
      attemptedAt: 0,
      failures: 0,
    };
    entries.set(key, entry);
  }
  return entry;
}

function publish(entry: Entry, snapshot: QuerySnapshot<unknown>): void {
  entry.snapshot = snapshot;
  entry.listeners.forEach((notify) => notify());
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function watchVisibility(): void {
  if (watchingVisibility || typeof document === "undefined") return;
  watchingVisibility = true;
  document.addEventListener("visibilitychange", () => {
    if (isHidden()) return;
    // catch up on anything that went stale while the tab was hidden
    entries.forEach((entry, key) => schedulePoll(key, entry));
  });
}

function schedulePoll(key: string, entry: Entry): void {
  const poll = entry.poll;
  if (!poll) return;
  clearTimeout(poll.timer);
  const backoff = Math.min(poll.everyMs * 2 ** entry.failures, Math.max(poll.everyMs, MAX_BACKOFF_MS));
  const due = entry.attemptedAt + backoff - Date.now();
  poll.timer = setTimeout(() => {
    // hidden tabs skip their turn; the visibility listener resumes them
    if (isHidden() || !entry.fetcher) return;
    void loadQuery(key, entry.fetcher);
  }, Math.max(0, due));
}

async function run(key: string, entry: Entry, fetcher: () => Promise<unknown>): Promise<void> {
  const startedIn = generation;
  const version = entry.version;
  let next: QuerySnapshot<unknown>;
  let changedMeanwhile = false;
  try {
    const data = await fetcher();
    if (startedIn !== generation) return;
    // invalidated while this load was running: its data may predate the change
    changedMeanwhile = entry.version !== version;
    entry.invalidated = changedMeanwhile;
    entry.failures = 0;
    entry.lastError = undefined;
    next = { data, error: null, updatedAt: Date.now() };
  } catch (error) {
    if (startedIn !== generation) return;
    entry.failures += 1;
    entry.lastError = error;
    // keep the last good data on a failed refresh
    next = { ...entry.snapshot, error: error instanceof Error ? error.message : "Request failed" };
  }
  entry.inflight = undefined;
  entry.attemptedAt = Date.now();
  publish(entry, next);
  schedulePoll(key, entry);
  if (changedMeanwhile && entry.listeners.size) void loadQuery(key, fetcher);
}

export function readQuery<T>(key: string): QuerySnapshot<T> {
  return (entries.get(key)?.snapshot ?? EMPTY_SNAPSHOT) as QuerySnapshot<T>;
}

/** True when the key has no data, was invalidated, or its data is older than `staleMs`. */
export function isStale(key: string, staleMs: number): boolean {
  const entry = entries.get(key);
  if (!entry || entry.invalidated || !entry.snapshot.updatedAt) return true;
  return Date.now() - entry.snapshot.updatedAt > staleMs;
}

/** Loads a key and notifies its observers. Concurrent calls share one request; never rejects. */
export function loadQuery<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  const entry = entryFor(key);
  entry.fetcher = fetcher;
  entry.inflight ??= run(key, entry, fetcher);
  return entry.inflight;
}

/**
 * Resolves with cached data while it is fresh; otherwise loads it (sharing any
 * load already running). Rejects with the loader's own error.
 */
export async function fetchQuery<T>(key: string, fetcher: () => Promise<T>, staleMs = 60_000): Promise<T> {
  if (!isStale(key, staleMs)) return readQuery<T>(key).data as T;
  await loadQuery(key, fetcher);
  const entry = entryFor(key);
  if (entry.snapshot.error) throw entry.lastError ?? new Error(entry.snapshot.error);
  return entry.snapshot.data as T;
}

/**
 * Observes a key. With `poll`, the first observer starts polling it and the
 * last one to leave stops it.
 */
export function subscribeQuery(key: string, listener: Listener, poll?: PollOptions): () => void {
  const entry = entryFor(key);
  entry.listeners.add(listener);
  if (poll) {
    entry.fetcher = poll.fetcher;
    if (!entry.poll) {
      entry.poll = { everyMs: poll.everyMs };
      watchVisibility();
      schedulePoll(key, entry);
    }
  }
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0 && entry.poll) {
      clearTimeout(entry.poll.timer);
      entry.poll = undefined;
    }
  };
}

/** Replaces cached data without a request, e.g. with what a mutation returned. */
export function setQueryData<T>(key: string, update: (previous: T | undefined) => T): void {
  const entry = entryFor(key);
  entry.invalidated = false;
  publish(entry, { data: update(entry.snapshot.data as T | undefined), error: null, updatedAt: Date.now() });
}

/**
 * Seeds a key with data loaded elsewhere (e.g. one item of a list).
 * `requestedAt` is when that other request started: the seed is skipped if the
 * key already holds newer data or was invalidated after that moment.
 */
export function primeQuery<T>(key: string, data: T, requestedAt: number): void {
  const entry = entryFor(key);
  if (entry.inflight || entry.snapshot.updatedAt >= requestedAt || entry.invalidatedAt >= requestedAt) return;
  entry.invalidated = false;
  publish(entry, { data, error: null, updatedAt: requestedAt });
}

/**
 * Marks a key stale, keeping its data until the reload lands. Observed keys
 * reload right away. A key ending in ":" matches every key with that prefix.
 */
export function invalidateQuery(keyOrPrefix: string): void {
  const prefix = keyOrPrefix.endsWith(":");
  entries.forEach((entry, key) => {
    if (prefix ? !key.startsWith(keyOrPrefix) : key !== keyOrPrefix) return;
    entry.invalidated = true;
    entry.version += 1;
    entry.invalidatedAt = Date.now();
    if (entry.listeners.size && entry.fetcher && !entry.inflight) void loadQuery(key, entry.fetcher);
  });
}

/** Forgets all data, e.g. on sign-out, so the next account never sees this one's. */
export function clearQueries(): void {
  generation += 1;
  entries.forEach((entry, key) => {
    entry.inflight = undefined;
    if (!entry.listeners.size) {
      if (entry.poll) clearTimeout(entry.poll.timer);
      entries.delete(key);
      return;
    }
    entry.invalidated = false;
    entry.lastError = undefined;
    entry.attemptedAt = 0;
    entry.failures = 0;
    publish(entry, EMPTY_SNAPSHOT);
    // still on screen: load it again for whoever is signed in now
    if (entry.fetcher) void loadQuery(key, entry.fetcher);
  });
}
