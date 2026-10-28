import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  clearPersistedQueryCache,
  persistQueryClient,
  restoreQueryClient,
  CACHE_STORAGE_KEY,
} from "../src/lib/query-persistence";
import { setStorageAdapter, memoryStorageAdapter } from "../src/lib/cache-storage";

describe("Bug #3: logout must clear TanStack Query cache and persisted cache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Use in-memory storage adapter for tests
    setStorageAdapter(memoryStorageAdapter);
    memoryStorageAdapter.clearAll();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 1000 * 60 * 60 },
      },
    });
  });

  it("clearPersistedQueryCache clears both in-memory queries and persisted storage", async () => {
    // 1. Populate the query cache with user-specific data
    queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: "c1", title: "UPSC Course" }]);
    queryClient.setQueryData(["home-dashboard"], { streak: 5, xp: 200 });

    // Verify data is in the cache
    const coursesBefore = queryClient.getQueryData(["courses-list", "ALL", ""]);
    assert.ok(coursesBefore, "Courses should exist in cache before logout");

    // 2. Persist the cache to storage (simulating normal app operation)
    await persistQueryClient(queryClient);
    const persisted = await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY);
    assert.ok(persisted, "Persisted cache should exist in storage");

    // 3. Call clearPersistedQueryCache (what logout now calls)
    await clearPersistedQueryCache(queryClient);

    // 4. Verify in-memory query cache is empty
    const coursesAfter = queryClient.getQueryData(["courses-list", "ALL", ""]);
    assert.equal(coursesAfter, undefined, "Courses must be gone from in-memory cache after clear");

    const dashAfter = queryClient.getQueryData(["home-dashboard"]);
    assert.equal(dashAfter, undefined, "Dashboard data must be gone from in-memory cache after clear");

    // 5. Verify persisted storage is also cleared
    const persistedAfter = await memoryStorageAdapter.getItem(CACHE_STORAGE_KEY);
    assert.equal(persistedAfter, null, "Persisted cache must be removed from storage");
  });

  it("clears the in-memory cache even when persisted-storage removal fails", async () => {
    setStorageAdapter({
      ...memoryStorageAdapter,
      removeItem: async () => {
        throw new Error("storage IO failure");
      },
    });

    queryClient.setQueryData(["user-scoped-data"], { id: "user-a" });
    assert.ok(queryClient.getQueryData(["user-scoped-data"]));

    await clearPersistedQueryCache(queryClient);

    assert.equal(
      queryClient.getQueryData(["user-scoped-data"]),
      undefined,
      "In-memory cache must clear even if persisting storage removal throws"
    );

    setStorageAdapter(memoryStorageAdapter);
  });

  it("without clearPersistedQueryCache, stale data survives into next session (proving the bug)", async () => {
    // 1. User A session: populate and persist
    queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: "c1", title: "User A Course" }]);
    await persistQueryClient(queryClient);

    // 2. Simulate logout WITHOUT clearing cache (old broken behavior)
    // Only clear tokens — don't touch queryClient or persisted storage
    // (this is what the old logout did)

    // 3. New session: create a fresh QueryClient and restore from persisted cache
    const newClient = new QueryClient();
    const restored = await restoreQueryClient(newClient);
    assert.equal(restored, true, "Persisted cache restored successfully");

    // 4. User B now sees User A's stale data — THIS IS THE BUG
    const staleData = newClient.getQueryData(["courses-list", "ALL", ""]) as any[];
    assert.ok(staleData, "Stale data from User A leaks to User B session");
    assert.equal(staleData[0].title, "User A Course", "User B sees User A's course data");
  });

  it("with clearPersistedQueryCache, new session starts clean", async () => {
    // 1. User A session: populate and persist
    queryClient.setQueryData(["courses-list", "ALL", ""], [{ id: "c1", title: "User A Course" }]);
    await persistQueryClient(queryClient);

    // 2. Logout WITH the fix: clear cache
    await clearPersistedQueryCache(queryClient);

    // 3. New session: fresh QueryClient + restore attempt
    const newClient = new QueryClient();
    const restored = await restoreQueryClient(newClient);
    assert.equal(restored, false, "No persisted cache to restore after proper logout");

    // 4. User B gets a clean slate
    const data = newClient.getQueryData(["courses-list", "ALL", ""]);
    assert.equal(data, undefined, "No stale data leaks to new user session");
  });
});
