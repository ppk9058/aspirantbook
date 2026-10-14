"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

// Client-side batcher for test user status requests
// Coalesces concurrent per-card requests into a single batched network call.
// Scoped per-user to strictly prevent cross-user status leakage.

let pendingTestIds = new Set<string>();
let pendingResolvers = new Map<string, Array<(status: any) => void>>();
let batchTimer: NodeJS.Timeout | null = null;
const statusCache = new Map<string, { status: any; timestamp: number }>();
const CACHE_TTL_MS = 10000; // 10s fresh cache

export function useBatchUserStatus(testIds: string[]) {
  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id;
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const serializedTestIds = testIds.slice().sort().join(",");

  useEffect(() => {
    // If not authenticated or guest, student has no attempts; return early with zero network calls
    if (!userId || authStatus !== "authenticated" || !testIds.length) {
      setStatuses({});
      setLoading(false);
      return;
    }

    const uniqueIds = Array.from(new Set(testIds.filter(Boolean))).slice(0, 100);
    if (uniqueIds.length === 0) return;

    const now = Date.now();
    const missingIds: string[] = [];
    const currentStatuses: Record<string, any> = {};

    for (const id of uniqueIds) {
      const cacheKey = `${userId}:${id}`;
      const cached = statusCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        currentStatuses[id] = cached.status;
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length === 0) {
      setStatuses(currentStatuses);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchStatuses = async () => {
      try {
        let res: Response;
        if (missingIds.length <= 40) {
          res = await fetch(`/api/exam/attempt/user-status?testIds=${encodeURIComponent(missingIds.join(","))}`);
        } else {
          res = await fetch("/api/exam/attempt/user-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ testIds: missingIds }),
          });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = json?.success && json.data ? json.data : {};
        const fetchTime = Date.now();

        for (const [id, st] of Object.entries(data)) {
          statusCache.set(`${userId}:${id}`, { status: st, timestamp: fetchTime });
          currentStatuses[id] = st;
        }
        for (const id of missingIds) {
          if (!currentStatuses[id]) {
            const defStatus = { state: "NOT_STARTED" };
            statusCache.set(`${userId}:${id}`, { status: defStatus, timestamp: fetchTime });
            currentStatuses[id] = defStatus;
          }
        }
        if (isMounted) {
          setStatuses({ ...currentStatuses });
        }
      } catch (err) {
        console.warn("[useBatchUserStatus] Failed to fetch statuses:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStatuses();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authStatus, serializedTestIds]);

  return { statuses, loading };
}

export function fetchBatchedUserStatus(testId: string, userId = "anonymous"): Promise<any> {
  const cacheKey = `${userId}:${testId}`;
  const cached = statusCache.get(cacheKey);
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

export async function prefetchUserStatuses(testIds: string[], userId = "anonymous"): Promise<Record<string, any>> {
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
      statusCache.set(`${userId}:${id}`, { status, timestamp: now });
    }

    return data;
  } catch (err) {
    console.warn("[batched-user-status] Prefetch failed:", err);
    return {};
  }
}

export function invalidateUserStatusCache(testId?: string, userId?: string) {
  if (testId && userId) {
    statusCache.delete(`${userId}:${testId}`);
  } else if (testId) {
    for (const key of statusCache.keys()) {
      if (key.endsWith(`:${testId}`)) {
        statusCache.delete(key);
      }
    }
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
      statusCache.set(`anonymous:${id}`, { status, timestamp: now });
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
