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

export async function persistQueryClient(queryClient: QueryClient): Promise<void> {
  const adapter = getStorageAdapter();
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
  const adapter = getStorageAdapter();
  try {
    await adapter.removeItem(CACHE_STORAGE_KEY);
    if (queryClient) {
      queryClient.clear();
    }
  } catch {}
}
