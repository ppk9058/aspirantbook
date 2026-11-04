import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { getStorageAdapter } from "./cache-storage";

export const CACHE_STORAGE_KEY = "ab_tanstack_query_cache_v1";

// Per-resource caching policies (staleTime and gcTime for instant stale-while-revalidate)
export const CACHE_POLICIES = {
  home: {
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  tests: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24,
  },
  tutorials: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 48, // 48 hours
  },
  currentAffairs: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24,
  },
  library: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60 * 72, // 72 hours
  },
  config: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 72,
  },
};

// Debounced persistence: the cache observer fires on every query update, and
// each write dehydrates the whole cache and writes it synchronously to SQLite.
// Coalescing writes into one quiet window keeps the persisted payload and key
// identical while removing the write storm during startup/list loads.
export const PERSIST_DEBOUNCE_MS = 2000;

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistQueryClient(
  queryClient: QueryClient,
  delayMs: number = PERSIST_DEBOUNCE_MS
): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistQueryClient(queryClient);
  }, delayMs);
}

export function cancelScheduledPersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

/**
 * Write immediately (AppState background/inactive, unmount) so the data
 * restored on next launch is exactly what the last non-persisted window held.
 */
export function flushPersistedQueryClient(queryClient: QueryClient): Promise<void> {
  cancelScheduledPersist();
  return persistQueryClient(queryClient);
}

export async function persistQueryClient(queryClient: QueryClient): Promise<void> {  const adapter = getStorageAdapter();
  try {
    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        // Only dehydrate successful public read queries
        const queryKey = query.queryKey[0];
        const isSensitive =
          queryKey === "attempt" ||
          queryKey === "activeExam" ||
          queryKey === "answers" ||
          queryKey === "userPrivate";
        return query.state.status === "success" && !isSensitive;
      },
    });
    await adapter.setItem(CACHE_STORAGE_KEY, JSON.stringify(dehydrated));
  } catch {
    // Fail-open: cache write failure should never block UI
  }
}

export async function restoreQueryClient(queryClient: QueryClient): Promise<boolean> {
  const adapter = getStorageAdapter();
  try {
    const serialized = await adapter.getItem(CACHE_STORAGE_KEY);
    if (!serialized) return false;
    const dehydrated = JSON.parse(serialized);
    hydrate(queryClient, dehydrated);
    return true;
  } catch {
    return false;
  }
}

export async function clearPersistedQueryCache(queryClient?: QueryClient): Promise<void> {
  // A debounced write from before the logout must never resurrect the previous
  // account's cache after it has been removed.
  cancelScheduledPersist();
  const adapter = getStorageAdapter();
  try {
    await adapter.removeItem(CACHE_STORAGE_KEY);
  } catch (err: unknown) {
    // Storage removal can fail (permissions/IO); the in-memory cache must still
    // be wiped so the next user never sees the previous account's data.
    void err;
  } finally {
    queryClient?.clear();
  }
}

export function createDefaultQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes default
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        retry: 2,
        networkMode: "offlineFirst",
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: "offlineFirst",
      },
    },
  });
}

