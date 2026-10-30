import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getSeriesCacheKey,
  seriesModuleCache,
} from "@/lib/exam/series-cache";
import {
  invalidateCachedUserGoalPromise,
  getCachedUserGoalPromise,
  setCachedUserGoalPromise,
} from "@/components/providers/GoalProvider";

describe("Task C: Cache Staleness Regressions", () => {
  describe("1. Test Series Module Cache Keying", () => {
    beforeEach(() => {
      seriesModuleCache.clear();
    });

    test("Key differentiates between user A and user B with identical goals", () => {
      const keyUserA = getSeriesCacheKey("user_A", ["upsc", "bpsc"]);
      const keyUserB = getSeriesCacheKey("user_B", ["upsc", "bpsc"]);

      assert.notEqual(keyUserA, keyUserB, "Different users must not share cache keys");
    });

    test("Key differentiates between different goal sets for the same user", () => {
      const keyUpsc = getSeriesCacheKey("user_123", ["upsc"]);
      const keyBpsc = getSeriesCacheKey("user_123", ["bpsc"]);

      assert.notEqual(keyUpsc, keyBpsc, "Different goals must not share cache keys");
    });

    test("Key normalizes goal order so order permutations match", () => {
      const key1 = getSeriesCacheKey("user_123", ["bpsc", "upsc"]);
      const key2 = getSeriesCacheKey("user_123", ["upsc", "bpsc"]);

      assert.equal(key1, key2, "Goal order permutation should yield identical cache key");
    });

    test("Guest users have isolated keys from authenticated users", () => {
      const guestKey = getSeriesCacheKey(null, ["upsc"]);
      const userKey = getSeriesCacheKey("user_456", ["upsc"]);

      assert.notEqual(guestKey, userKey, "Guest and authenticated user must have different keys");
      assert.match(guestKey, /^guest::/);
    });

    test("Switching user or goal never returns another user's or goal's series from cache", () => {
      const keyA = getSeriesCacheKey("user_A", ["upsc"]);
      const keyB = getSeriesCacheKey("user_B", ["upsc"]);
      const keyAGoal2 = getSeriesCacheKey("user_A", ["bpsc"]);

      const mockDataA = [{ id: "upsc-series-1", title: "UPSC Mock 1" } as any];
      const mockDataB = [{ id: "upsc-series-2", title: "UPSC Mock 2" } as any];

      seriesModuleCache.set(keyA, { data: mockDataA, timestamp: Date.now() });
      seriesModuleCache.set(keyB, { data: mockDataB, timestamp: Date.now() });

      assert.deepEqual(seriesModuleCache.get(keyA)?.data, mockDataA);
      assert.deepEqual(seriesModuleCache.get(keyB)?.data, mockDataB);
      assert.equal(seriesModuleCache.get(keyAGoal2), undefined, "Switched goal should have no cached series yet");
    });
  });

  describe("2. GoalProvider cachedUserGoalPromise Invalidation", () => {
    beforeEach(() => {
      invalidateCachedUserGoalPromise();
    });

    test("cachedUserGoalPromise can be set and explicitly invalidated", () => {
      const dummyPromise = Promise.resolve({ goal: { goalId: "upsc" } });
      setCachedUserGoalPromise(dummyPromise);
      assert.equal(getCachedUserGoalPromise(), dummyPromise);

      invalidateCachedUserGoalPromise();
      assert.equal(getCachedUserGoalPromise(), null, "cachedUserGoalPromise must be null after invalidation");
    });

    test("Simulating goalChange invalidation resets cachedUserGoalPromise", () => {
      const dummyPromise = Promise.resolve({ goal: { goalId: "upsc" } });
      setCachedUserGoalPromise(dummyPromise);

      // Trigger invalidation like goalChange handler does
      invalidateCachedUserGoalPromise();
      assert.equal(getCachedUserGoalPromise(), null, "goalChange must clear cachedUserGoalPromise");
    });

    test("Simulating storage event invalidation resets cachedUserGoalPromise", () => {
      const dummyPromise = Promise.resolve({ goal: { goalId: "upsc" } });
      setCachedUserGoalPromise(dummyPromise);

      // Trigger invalidation like storage handler does
      invalidateCachedUserGoalPromise();
      assert.equal(getCachedUserGoalPromise(), null, "storage event must clear cachedUserGoalPromise");
    });

    test("Simulating session user change invalidation resets cachedUserGoalPromise", () => {
      const dummyPromise = Promise.resolve({ goal: { goalId: "upsc" } });
      setCachedUserGoalPromise(dummyPromise);

      // Trigger invalidation like session user change effect does
      invalidateCachedUserGoalPromise();
      assert.equal(getCachedUserGoalPromise(), null, "session user change must clear cachedUserGoalPromise");
    });
  });
});
