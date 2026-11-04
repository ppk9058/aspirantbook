import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  CACHE_STORAGE_KEY,
  PERSIST_DEBOUNCE_MS,
  cancelScheduledPersist,
  clearPersistedQueryCache,
  flushPersistedQueryClient,
  restoreQueryClient,
  schedulePersistQueryClient,
} from "../src/lib/query-persistence";
import { setStorageAdapter, memoryStorageAdapter } from "../src/lib/cache-storage";

// F2: cache writes are debounced but the persisted payload, key and restore
// path are unchanged, and a logout can never be undone by a pending write.

function countingAdapter() {
  let writes = 0;
  const adapter = {
    getItem: memoryStorageAdapter.getItem,
    setItem: (key: string, value: string) => {
      writes += 1;
      memoryStorageAdapter.setItem(key, value);
    },
    removeItem: memoryStorageAdapter.removeItem,
    clearAll: memoryStorageAdapter.clearAll,
  };
  return { adapter, writes: () => writes };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("F2: debounced query-cache persistence", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    memoryStorageAdapter.clearAll();
    cancelScheduledPersist();
    queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: 1000 * 60 * 60 } },
    });
  });

  afterEach(() => {
    cancelScheduledPersist();
    // Drop the clients' gc timers so the node test runner can exit.
    queryClient.clear();
  });

  it("coalesces N query updates into a single write", async () => {
    const { adapter, writes } = countingAdapter();
    setStorageAdapter(adapter);

    for (let i = 0; i < 10; i++) {
      queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: `c${i}` }]);
      schedulePersistQueryClient(queryClient, PERSIST_DEBOUNCE_MS);
    }
    assert.equal(writes(), 0, "no write before the debounce window elapses");

    await wait(PERSIST_DEBOUNCE_MS + 300);
    assert.equal(writes(), 1, "exactly one write for ten updates");

    const stored = await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY);
    assert.ok(stored, "the last payload must be persisted");
    const dehydrated = JSON.parse(stored as string);
    assert.deepEqual(
      dehydrated.queries[0].queryKey,
      ["courses-list", "ALL", ""],
      "the same query key is persisted"
    );
    assert.deepEqual(
      dehydrated.queries[0].state.data,
      [{ id: "c9" }],
      "the last value is persisted"
    );
  });

  it("flush writes immediately, before the debounce window elapses", async () => {
    const { adapter, writes } = countingAdapter();
    setStorageAdapter(adapter);

    queryClient.setQueryData(["home-dashboard", "upsc"], { streakDays: 3 });
    schedulePersistQueryClient(queryClient, PERSIST_DEBOUNCE_MS);
    assert.equal(writes(), 0);

    await flushPersistedQueryClient(queryClient);
    assert.equal(writes(), 1, "background/inactive flush persists right away");

    const stored = await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY);
    assert.ok(stored);
    const dehydrated = JSON.parse(stored as string);
    assert.deepEqual(dehydrated.queries[0].state.data, { streakDays: 3 });
  });

  it("restores the same data after a debounced write (same key/buster)", async () => {
    const { adapter } = countingAdapter();
    setStorageAdapter(adapter);

    queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: "c1", title: "Alpha" }]);
    schedulePersistQueryClient(queryClient, 10);
    await wait(120);

    const fresh = new QueryClient();
    const restored = await restoreQueryClient(fresh);
    assert.equal(restored, true);
    assert.deepEqual(fresh.getQueryData(["courses-list", "ALL", ""]), [
      { id: "c1", title: "Alpha" },
    ]);
    assert.equal(CACHE_STORAGE_KEY, "ab_tanstack_query_cache_v1", "buster/version unchanged");
    fresh.clear();
  });

  it("a pending write never resurrects the cache after clearPersistedQueryCache", async () => {
    const { adapter, writes } = countingAdapter();
    setStorageAdapter(adapter);

    queryClient.setQueryData(["profile-me"], { id: "u1", email: "user@example.test" });
    schedulePersistQueryClient(queryClient, PERSIST_DEBOUNCE_MS);

    await clearPersistedQueryCache(queryClient);
    await wait(PERSIST_DEBOUNCE_MS + 300);

    assert.equal(writes(), 0, "the cancelled write must not run after logout");
    assert.equal(await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY), null);
  });

  it("keeps the sensitive-query exclusion list unchanged", async () => {
    const { adapter } = countingAdapter();
    setStorageAdapter(adapter);

    queryClient.setQueryData(["attempt", "a1"], { answers: [1] });
    queryClient.setQueryData(["activeExam"], { id: "a1" });
    queryClient.setQueryData(["answers", "a1"], [{ id: 1 }]);
    queryClient.setQueryData(["userPrivate"], { secret: true });
    queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: "c1" }]);
    await flushPersistedQueryClient(queryClient);

    const stored = JSON.parse((await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY)) as string);
    const keys = stored.queries.map((q: any) => q.queryKey[0]);
    assert.deepEqual(keys, ["courses-list"]);
  });
});
