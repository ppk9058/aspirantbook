import { prisma } from "./prisma";
import { getCached, setCache } from "./redis";
import { isExamCacheQuestionsEnabled } from "./exam-flags";
import { getExamQuestionsVersion } from "./exam-runtime/cache-invalidation";
import crypto from "crypto";

export interface SanitizedQuestionDto {
  id: string;
  order: number;
  questionEn: string | null;
  questionHi: string | null;
  optionAEn: string | null;
  optionBEn: string | null;
  optionCEn: string | null;
  optionDEn: string | null;
  optionAHi: string | null;
  optionBHi: string | null;
  optionCHi: string | null;
  optionDHi: string | null;
  questionType: string | null;
  subject: string | null;
  positiveMarks: number;
  negativeMarks: number;
}

export interface SanitizedSectionDto {
  id: string;
  title: string;
  titleHi: string | null;
  order: number;
  positiveMarks: number;
  negativeMarks: number;
  timeLimitMins: number | null;
  questions: SanitizedQuestionDto[];
}

export interface SanitizedQuestionSet {
  testId: string;
  version: string;
  etag: string;
  sections: SanitizedSectionDto[];
}

/**
 * Returns the sanitized question paper for a test with correct answers and explanations stripped.
 * Zero-leakage guaranteed.
 * P1-1: Includes inter-process version tracking so edits made on another node/process
 * invalidate the cached questions immediately within the configured TTL (<= 60s).
 */
export async function getSanitizedQuestionSet(testId: string): Promise<SanitizedQuestionSet | null> {
  const cacheKey = `exam:sanitized-questions:v1:${testId}`;
  const ttlSecs = Math.max(
    1,
    Math.min(60, Number(process.env.EXAM_QUESTIONS_CACHE_TTL_SECS) || 60)
  );

  let currentVersion = "";
  if (isExamCacheQuestionsEnabled()) {
    currentVersion = await getExamQuestionsVersion(testId);
    const cached = await getCached<SanitizedQuestionSet>(cacheKey);
    if (cached && cached.version === currentVersion) {
      return cached;
    }
  }

  const sections = await prisma.examSection.findMany({
    where: { testId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      titleHi: true,
      order: true,
      positiveMarks: true,
      negativeMarks: true,
      timeLimitMins: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          questionEn: true,
          questionHi: true,
          optionAEn: true,
          optionBEn: true,
          optionCEn: true,
          optionDEn: true,
          optionAHi: true,
          optionBHi: true,
          optionCHi: true,
          optionDHi: true,
          questionType: true,
          subject: true,
          positiveMarks: true,
          negativeMarks: true,
          // CRITICAL: NEVER select correctOption, explanationEn, explanationHi here!
        },
      },
    },
  });

  if (!sections || sections.length === 0) {
    return null;
  }

  // Double-check verification: Assert zero leakage of secret keys
  const serialized = JSON.stringify(sections);
  if (
    serialized.includes("correctOption") ||
    serialized.includes("explanationEn") ||
    serialized.includes("explanationHi")
  ) {
    throw new Error("[SECURITY CRITICAL] Question sanitization detected answer leakage!");
  }

  const etag = crypto.createHash("sha256").update(serialized).digest("hex").slice(0, 16);

  if (!currentVersion) {
    currentVersion = await getExamQuestionsVersion(testId);
  }

  const result: SanitizedQuestionSet = {
    testId,
    version: currentVersion,
    etag,
    sections: sections as unknown as SanitizedSectionDto[],
  };

  if (isExamCacheQuestionsEnabled()) {
    await setCache(cacheKey, result, ttlSecs);
  }

  return result;
}
