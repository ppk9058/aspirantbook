export interface TestSeriesCacheItem {
  id: string;
  slug?: string;
  title: string;
  category: string;
  description?: string;
  goalId?: string;
  tags: string[];
  highlights: string[];
  totalTests: number;
  freeTests: number;
  users: string;
  logoType: string;
  isFree: boolean;
  isPro: boolean;
  languages: string;
  examName?: string;
}

export function getSeriesCacheKey(
  userId: string | null | undefined,
  goalIds: string[] | null | undefined,
  filterByGoal: boolean = true
): string {
  const uid = userId || "guest";
  if (!filterByGoal) {
    return `all::${uid}`;
  }
  const normalizedGoals = Array.isArray(goalIds)
    ? [...goalIds].map((g) => g.trim().toLowerCase()).sort().join(",")
    : "";
  return `${uid}::${normalizedGoals}`;
}

export const seriesModuleCache = new Map<string, { data: TestSeriesCacheItem[]; timestamp: number }>();
export const SERIES_CACHE_TTL_MS = 60_000; // 60s memory cache
