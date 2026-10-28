import { prisma } from "./prisma";
import { isExamCacheLeaderboardEnabled } from "./exam-flags";
import { getCached, setCache } from "./redis";

export interface RankedAttempt {
  attemptId: string;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  timeTakenSecs: number;
  submittedAt: Date | null;
  rank: number;
  percentile: number;
  accuracy: number;
  isFirstAttempt: boolean;
}

export interface TestRankingsResult {
  testId: string;
  totalCandidates: number;
  rankedAttempts: RankedAttempt[];
  attemptRankMap: Map<string, { rank: number; percentile: number; isFirstAttempt: boolean }>;
  userRankMap: Map<string, { rank: number; percentile: number }>;
}

/**
 * Computes authoritative rankings for a test according to core examination rules:
 * 1. Only role STUDENT (i.e. not TEACHER or ADMIN) attempts count.
 * 2. Only SUBMITTED attempts count.
 * 3. Exactly ONE attempt per user: the user's FIRST submitted attempt for that test.
 * 4. Ranking order: score DESC, timeTakenSecs ASC, submittedAt ASC.
 * 5. Rank and percentile are identical across leaderboard, result, submission, and grading.
 */
export async function getTestRankings(testId: string): Promise<TestRankingsResult> {
  const cacheKey = `exam:test-rankings:v1:${testId}`;

  if (isExamCacheLeaderboardEnabled()) {
    const cached = await getCached<{
      testId: string;
      totalCandidates: number;
      rankedAttempts: any[];
      attemptRankEntries: [string, { rank: number; percentile: number; isFirstAttempt: boolean }][];
      userRankEntries: [string, { rank: number; percentile: number }][];
    }>(cacheKey);

    if (cached) {
      return {
        testId: cached.testId,
        totalCandidates: cached.totalCandidates,
        rankedAttempts: cached.rankedAttempts.map((r) => ({
          ...r,
          submittedAt: r.submittedAt ? new Date(r.submittedAt) : null,
        })),
        attemptRankMap: new Map(cached.attemptRankEntries),
        userRankMap: new Map(cached.userRankEntries),
      };
    }
  }

  const allAttempts = await prisma.examAttempt.findMany({
    where: {
      testId,
      status: "SUBMITTED",
      user: {
        role: {
          notIn: ["TEACHER", "ADMIN"],
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: [
      { submittedAt: "asc" },
      { startedAt: "asc" },
    ],
  });

  // 1. Deduplicate by user: take each user's FIRST submitted attempt
  const firstAttemptByUser = new Map<string, (typeof allAttempts)[0]>();
  const firstAttemptIds = new Set<string>();

  for (const att of allAttempts) {
    if (!firstAttemptByUser.has(att.userId)) {
      firstAttemptByUser.set(att.userId, att);
      firstAttemptIds.add(att.id);
    }
  }

  const qualifyingAttempts = Array.from(firstAttemptByUser.values());

  // 2. Sort candidates: score DESC, timeTakenSecs ASC, submittedAt ASC
  qualifyingAttempts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.timeTakenSecs !== b.timeTakenSecs) return a.timeTakenSecs - b.timeTakenSecs;
    const aTime = a.submittedAt ? a.submittedAt.getTime() : 0;
    const bTime = b.submittedAt ? b.submittedAt.getTime() : 0;
    return aTime - bTime;
  });

  const totalCandidates = qualifyingAttempts.length;

  const attemptRankMap = new Map<string, { rank: number; percentile: number; isFirstAttempt: boolean }>();
  const userRankMap = new Map<string, { rank: number; percentile: number }>();

  // 3. Compute rank and percentile with 1, 2, 2, 4 tie rule
  let currentRank = 1;
  const rankedAttempts: RankedAttempt[] = qualifyingAttempts.map((a, idx) => {
    if (idx > 0) {
      const prev = qualifyingAttempts[idx - 1];
      if (a.score === prev.score && a.timeTakenSecs === prev.timeTakenSecs) {
        // Tied: keep currentRank
      } else {
        currentRank = idx + 1; // Skip ranks
      }
    } else {
      currentRank = 1;
    }
    const rank = currentRank;
    const percentile =
      totalCandidates > 1
        ? parseFloat((((totalCandidates - (rank - 1)) / totalCandidates) * 100).toFixed(2))
        : totalCandidates === 1
        ? 100
        : 0;

    const accuracy = Math.round(
      (a.correctCount / Math.max(1, a.correctCount + a.wrongCount)) * 100
    );

    const info = { rank, percentile, isFirstAttempt: true };
    attemptRankMap.set(a.id, info);
    userRankMap.set(a.userId, { rank, percentile });

    return {
      attemptId: a.id,
      userId: a.user.id,
      name: a.user.name || "Candidate",
      avatar: a.user.image,
      score: a.score,
      totalMarks: a.totalMarks,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      timeTakenSecs: a.timeTakenSecs,
      submittedAt: a.submittedAt,
      rank,
      percentile,
      accuracy,
      isFirstAttempt: true,
    };
  });

  // Map any subsequent attempts for users who already have an official first attempt rank
  for (const att of allAttempts) {
    if (!firstAttemptIds.has(att.id)) {
      const userRank = userRankMap.get(att.userId);
      if (userRank) {
        attemptRankMap.set(att.id, {
          rank: userRank.rank,
          percentile: userRank.percentile,
          isFirstAttempt: false,
        });
      }
    }
  }

  const result: TestRankingsResult = {
    testId,
    totalCandidates,
    rankedAttempts,
    attemptRankMap,
    userRankMap,
  };

  if (isExamCacheLeaderboardEnabled()) {
    // 10s TTL short-cache to coalesce deadline thundering herds
    await setCache(
      cacheKey,
      {
        testId,
        totalCandidates,
        rankedAttempts,
        attemptRankEntries: Array.from(attemptRankMap.entries()),
        userRankEntries: Array.from(userRankMap.entries()),
      },
      10
    );
  }

  return result;
}

/**
 * Retrieves the canonical rank and percentile for a specific attempt.
 * Returns null rank/percentile if attempt is not submitted or created by staff (TEACHER/ADMIN).
 */
export async function getAttemptRanking(attemptId: string): Promise<{
  rank: number | null;
  percentile: number | null;
  totalCandidates: number;
  isFirstAttempt: boolean;
  isStaff: boolean;
}> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      testId: true,
      userId: true,
      status: true,
      user: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!attempt || attempt.status !== "SUBMITTED") {
    return { rank: null, percentile: null, totalCandidates: 0, isFirstAttempt: false, isStaff: false };
  }

  // Teacher/Admin attempts never receive student ranking
  if (attempt.user.role === "TEACHER" || attempt.user.role === "ADMIN") {
    return { rank: null, percentile: null, totalCandidates: 0, isFirstAttempt: false, isStaff: true };
  }

  const { totalCandidates, attemptRankMap } = await getTestRankings(attempt.testId);
  const rankInfo = attemptRankMap.get(attempt.id);

  if (!rankInfo) {
    return { rank: null, percentile: null, totalCandidates, isFirstAttempt: false, isStaff: false };
  }

  return {
    rank: rankInfo.rank,
    percentile: rankInfo.percentile,
    totalCandidates,
    isFirstAttempt: rankInfo.isFirstAttempt,
    isStaff: false,
  };
}
