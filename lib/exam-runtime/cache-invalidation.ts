import { deleteCache, deleteCachePattern } from "../redis";
import { prisma } from "../prisma";

/**
 * P1-1: Centralized Cache Invalidation & Inter-Instance Versioning Module
 * Manages question cache, leaderboard cache, and provides documented hooks
 * for admin mutations and the upcoming feat/ai-layer batch translations.
 */

// In-memory version tracker for fast LRU stale-checking
const questionVersions = new Map<string, { version: string; checkedAt: number }>();

export function clearLocalVersionTracker(testId?: string): void {
  if (testId) {
    questionVersions.delete(testId);
  } else {
    questionVersions.clear();
  }
}

const VERSION_CHECK_TTL_MS = Math.max(
  1000,
  (Number(process.env.EXAM_QUESTIONS_VERSION_CHECK_TTL_SECS) || 60) * 1000
);

/**
 * Computes a lightweight version hash for an exam's question set.
 * Uses question count + max(updatedAt) over sections for that test.
 * This guarantees any question creation, deletion, or modification made by another
 * process or container is noticed within the configured TTL without needing schema alterations.
 */
export async function getExamQuestionsVersion(testId: string): Promise<string> {
  const now = Date.now();
  const cached = questionVersions.get(testId);
  if (cached && now - cached.checkedAt < VERSION_CHECK_TTL_MS) {
    return cached.version;
  }

  try {
    const res: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT 
        COUNT(q.id)::int as count,
        COALESCE(MAX(q."updatedAt"), '1970-01-01'::timestamp) as max_updated
      FROM "ExamQuestion" q
      JOIN "ExamSection" s ON s.id = q."sectionId"
      WHERE s."testId" = $1
      `,
      testId
    );

    const count = res[0]?.count ?? 0;
    const maxUpdated = res[0]?.max_updated
      ? new Date(res[0].max_updated).getTime()
      : 0;
    const version = `${count}-${maxUpdated}`;

    questionVersions.set(testId, { version, checkedAt: now });
    return version;
  } catch (err) {
    console.warn(`[CacheInvalidation] Failed to compute question version for test ${testId}:`, err);
    return `fallback-${now}`;
  }
}

/**
 * Invalidates sanitized question cache for an exam.
 * Call on question edit, add, delete, reorder, section change, or translation update.
 */
export async function invalidateExamQuestions(testId: string): Promise<void> {
  questionVersions.delete(testId);
  const cacheKey = `exam:sanitized-questions:v1:${testId}`;
  await deleteCache(cacheKey);
}

/**
 * Invalidates cached leaderboard and ranking data for an exam.
 * Call on attempt submission or admin score adjustment.
 */
export async function invalidateLeaderboard(testId: string): Promise<void> {
  const cacheKey = `exam:test-rankings:v1:${testId}`;
  const leaderboardKey = `exam:leaderboard:v1:${testId}`;
  await deleteCache(cacheKey);
  await deleteCache(leaderboardKey);
}

/**
 * Invalidate both question and leaderboard caches for an exam.
 */
export async function invalidateAllExamCaches(testId: string): Promise<void> {
  await Promise.all([
    invalidateExamQuestions(testId),
    invalidateLeaderboard(testId),
  ]);
}

/**
 * Documented Hook for AI Layer Integration (feat/ai-layer)
 * Must be invoked by the AI translation batch approval action when
 * Hindi or regional translations for ExamQuestions are approved and committed.
 */
export async function onAiQuestionTranslationBatchApproved(
  testId: string,
  questionIds: string[]
): Promise<void> {
  console.info(
    `[AI_INTEGRATION_HOOK] Invalidating question cache for test ${testId} following AI batch translation approval of ${questionIds.length} questions.`
  );
  await invalidateExamQuestions(testId);
}
