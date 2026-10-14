"use client";

// Client-side batcher for test user status requests
// Coalesces concurrent per-card requests into a single batched network call.

let pendingTestIds = new Set<string>();
let pendingResolvers = new Map<string, Array<(status: any) => void>>();
let batchTimer: NodeJS.Timeout | null = null;
const statusCache = new Map<string, { status: any; timestamp: number }>();
const CACHE_TTL_MS = 10000; // 10s fresh cache

export function fetchBatchedUserStatus(testId: string): Promise<any> {
  // Check fast memory cache
  const cached = statusCache.get(testId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.status);
  }

  return new Promise((resolve) => {
    pendingTestIds.add(testId);
    if (!pendingResolvers.has(testId)) {
      pendingResolvers.set(testId, []);
    }
    pendingResolvers.get(testId)!.push(resolve);

    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, 25);
    }
  });
}

export async function prefetchUserStatuses(testIds: string[]): Promise<Record<string, any>> {
  const uniqueIds = Array.from(new Set(testIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  try {
    let res: Response;
    if (uniqueIds.length <= 40) {
      res = await fetch(`/api/exam/attempt/user-status?testIds=${encodeURIComponent(uniqueIds.join(","))}`);
    } else {
      res = await fetch("/api/exam/attempt/user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: uniqueIds }),
      });
    }

    const json = await res.json();
    const data = json?.success && json.data ? json.data : {};

    const now = Date.now();
    for (const [id, status] of Object.entries(data)) {
      statusCache.set(id, { status, timestamp: now });
    }

    return data;
  } catch (err) {
    console.warn("[batched-user-status] Prefetch failed:", err);
    return {};
  }
}

export function invalidateUserStatusCache(testId?: string) {
  if (testId) {
    statusCache.delete(testId);
  } else {
    statusCache.clear();
  }
}

async function flushBatch() {
  batchTimer = null;
  const ids = Array.from(pendingTestIds);
  const resolvers = new Map(pendingResolvers);
  pendingTestIds.clear();
  pendingResolvers.clear();

  if (ids.length === 0) return;

  try {
    let res: Response;
    if (ids.length <= 40) {
      res = await fetch(`/api/exam/attempt/user-status?testIds=${encodeURIComponent(ids.join(","))}`);
    } else {
      res = await fetch("/api/exam/attempt/user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids }),
      });
    }

    const json = await res.json();
    const data = json?.success && json.data ? json.data : {};
    const now = Date.now();

    for (const id of ids) {
      const status = data[id] || { state: "NOT_STARTED" };
      statusCache.set(id, { status, timestamp: now });
      const resList = resolvers.get(id) || [];
      for (const r of resList) {
        r(status);
      }
    }
  } catch (err) {
    for (const id of ids) {
      const resList = resolvers.get(id) || [];
      for (const r of resList) {
        r({ state: "NOT_STARTED" });
      }
    }
  }
}
