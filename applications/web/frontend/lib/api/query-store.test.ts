import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearQueries,
  fetchQuery,
  invalidateQuery,
  isStale,
  loadQuery,
  primeQuery,
  readQuery,
  setQueryData,
  subscribeQuery,
} from "./query-store.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A loader that counts its calls and resolves with the call number. */
function counter() {
  const load = Object.assign(async () => ++load.calls, { calls: 0 });
  return load;
}

describe("query store", () => {
  it("shares one request between callers that load at the same time", async () => {
    const load = counter();
    await Promise.all([loadQuery("dedupe", load), loadQuery("dedupe", load), fetchQuery("dedupe", load)]);
    assert.equal(load.calls, 1);
    assert.equal(readQuery<number>("dedupe").data, 1);
  });

  it("serves fresh data from the cache and reloads stale data", async () => {
    const load = counter();
    assert.equal(await fetchQuery("fresh", load, 60_000), 1);
    assert.equal(await fetchQuery("fresh", load, 60_000), 1);
    assert.equal(load.calls, 1);
    assert.equal(await fetchQuery("fresh", load, -1), 2);
  });

  it("notifies observers and keeps the last good data when a reload fails", async () => {
    let notified = 0;
    const stop = subscribeQuery("observed", () => notified++);
    await loadQuery("observed", async () => "first");
    await loadQuery("observed", async () => {
      throw new Error("offline");
    });
    stop();
    const snapshot = readQuery<string>("observed");
    assert.equal(notified, 2);
    assert.equal(snapshot.data, "first");
    assert.equal(snapshot.error, "offline");
  });

  it("rethrows the loader's own error from fetchQuery", async () => {
    class LoaderError extends Error {}
    await assert.rejects(
      fetchQuery("rethrow", async () => {
        throw new LoaderError("nope");
      }),
      LoaderError,
    );
  });

  it("reloads observed keys when they are invalidated", async () => {
    const load = counter();
    const stop = subscribeQuery("spaces:mine", () => {});
    await loadQuery("spaces:mine", load);
    invalidateQuery("spaces:");
    await sleep(10);
    stop();
    assert.equal(load.calls, 2);
    assert.equal(isStale("spaces:mine", 60_000), false);
  });

  it("marks unobserved keys stale without loading them", async () => {
    const load = counter();
    await loadQuery("lazy", load);
    invalidateQuery("lazy");
    assert.equal(load.calls, 1);
    assert.equal(isStale("lazy", 60_000), true);
  });

  it("polls while observed and stops when the last observer leaves", async () => {
    const load = counter();
    const stopA = subscribeQuery("poll", () => {}, { everyMs: 20, fetcher: load });
    const stopB = subscribeQuery("poll", () => {}, { everyMs: 20, fetcher: load });
    await sleep(150);
    stopA();
    const whileObserved = load.calls;
    assert.ok(whileObserved >= 3, `expected 3+ polls, got ${whileObserved}`);
    await sleep(100);
    stopB();
    const afterLast = load.calls;
    await sleep(100);
    assert.ok(afterLast > whileObserved, "the remaining observer keeps polling");
    assert.equal(load.calls, afterLast, "no polls after the last observer left");
  });

  it("seeds a key only when nothing newer happened to it", async () => {
    const before = Date.now() - 1_000;
    primeQuery("seed", "from list", before);
    assert.equal(readQuery<string>("seed").data, "from list");

    setQueryData("seed", () => "edited");
    primeQuery("seed", "older list", before);
    assert.equal(readQuery<string>("seed").data, "edited");

    invalidateQuery("seed");
    primeQuery("seed", "list from before the change", Date.now() - 1);
    assert.equal(readQuery<string>("seed").data, "edited");
  });

  it("drops data and late results on clear", async () => {
    let release: (value: string) => void = () => {};
    const slow = loadQuery("account", () => new Promise<string>((resolve) => (release = resolve)));
    clearQueries();
    release("previous user's data");
    await slow;
    assert.equal(readQuery("account").data, undefined);
    assert.equal(readQuery("dedupe").data, undefined);
  });
});
