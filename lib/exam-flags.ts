/**
 * Feature flags for high-performance exam runtime optimizations.
 * ALL flags default to FALSE (OFF) so merging changes nothing until turned on.
 */

export function isExamBatchSyncEnabled(): boolean {
  return process.env.EXAM_RUNTIME_BATCH_SYNC === "true" || process.env.EXAM_RUNTIME_BATCH_SYNC === "1";
}

export function isExamFastGradingEnabled(): boolean {
  return process.env.EXAM_RUNTIME_FAST_GRADING === "true" || process.env.EXAM_RUNTIME_FAST_GRADING === "1";
}

export function isExamCacheQuestionsEnabled(): boolean {
  return process.env.EXAM_RUNTIME_CACHE_QUESTIONS === "true" || process.env.EXAM_RUNTIME_CACHE_QUESTIONS === "1";
}

export function isExamCacheLeaderboardEnabled(): boolean {
  return process.env.EXAM_RUNTIME_CACHE_LEADERBOARD === "true" || process.env.EXAM_RUNTIME_CACHE_LEADERBOARD === "1";
}

export function isExamRedisRateLimitEnabled(): boolean {
  return process.env.EXAM_RUNTIME_REDIS_RATELIMIT === "true" || process.env.EXAM_RUNTIME_REDIS_RATELIMIT === "1";
}

export function isExamRateLimitEnabled(): boolean {
  return process.env.EXAM_RATE_LIMIT_ENABLED === "true" || process.env.EXAM_RATE_LIMIT_ENABLED === "1";
}

export function isExamAttemptCompactionEnabled(): boolean {
  return process.env.EXAM_ATTEMPT_COMPACTION_ENABLED === "true" || process.env.EXAM_ATTEMPT_COMPACTION_ENABLED === "1";
}


