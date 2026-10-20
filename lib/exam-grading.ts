import { prisma } from "@/lib/prisma";
import { getAttemptRanking } from "./exam-ranking";
import { calculateExamScore } from "@aspirantbook/shared";

export interface GradedAttemptResult {
  attemptId: string;
  testId: string;
  userId: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  markedCount: number;
  timeTakenSecs: number;
  percentile: number | null;
  allIndiaRank: number | null;
  totalCandidates: number;
}

async function getStoredResult(attemptId: string): Promise<GradedAttemptResult | null> {
  // If another process is currently writing fields, retry with backoff until submittedAt is set
  for (let i = 0; i < 20; i++) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        testId: true,
        status: true,
        score: true,
        totalMarks: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        markedCount: true,
        timeTakenSecs: true,
        percentile: true,
        allIndiaRank: true,
        submittedAt: true,
      },
    });

    if (!attempt) return null;

    if (attempt.status === "SUBMITTED" && attempt.submittedAt !== null) {
      const ranking = await getAttemptRanking(attempt.id);

      return {
        attemptId: attempt.id,
        testId: attempt.testId,
        userId: attempt.userId,
        score: attempt.score ?? 0,
        totalMarks: attempt.totalMarks ?? 0,
        correctCount: attempt.correctCount ?? 0,
        wrongCount: attempt.wrongCount ?? 0,
        skippedCount: attempt.skippedCount ?? 0,
        markedCount: attempt.markedCount ?? 0,
        timeTakenSecs: attempt.timeTakenSecs ?? 0,
        percentile: ranking.percentile,
        allIndiaRank: ranking.rank,
        totalCandidates: ranking.totalCandidates,
      };
    }

    // Wait 50ms before retrying to let winning process finish writing
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

/**
 * Authoritatively grades an exam attempt on the server.
 * Idempotent under concurrency: Uses atomic compare-and-set (CAS)
 * `updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: { status: "SUBMITTED" } })`.
 * Exactly one concurrent request wins and grades; all others wait and receive the stored result.
 */
export async function gradeExamAttempt(
  attemptId: string,
  now: Date = new Date()
): Promise<GradedAttemptResult | null> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      testId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      test: {
        select: {
          id: true,
          durationMinutes: true,
          totalMarks: true,
        },
      },
    },
  });

  if (!attempt) return null;

  // If already submitted and finalized with submittedAt, return stored result directly
  if (attempt.status === "SUBMITTED" && attempt.submittedAt !== null) {
    return getStoredResult(attemptId);
  }

  // If status is SUBMITTED but submittedAt is null (worker crashed or active):
  // Give an active worker up to 1 second to finish writing
  if (attempt.status === "SUBMITTED" && attempt.submittedAt === null) {
    const existing = await getStoredResult(attemptId);
    if (existing) return existing;
    // If still null, the previous worker crashed. Proceed to safely re-grade and recover below.
  }

  // Fetch all saved answers for this attempt
  const answers = await prisma.examAttemptAnswer.findMany({
    where: { attemptId },
    select: {
      questionId: true,
      selectedOption: true,
      isMarked: true,
      timeSpentSecs: true,
    },
  });

  // Fetch all questions for this test to ensure unattempted questions are counted
  const allQuestions = await prisma.examQuestion.findMany({
    where: {
      section: {
        testId: attempt.testId,
      },
    },
    select: {
      id: true,
      correctOption: true,
      positiveMarks: true,
      negativeMarks: true,
    },
  });

  const {
    totalScore,
    correctCount,
    wrongCount,
    skippedCount,
    markedCount,
    gradedAnswers,
  } = calculateExamScore(allQuestions, answers);


  const testDurationSecs = (attempt.test!.durationMinutes) * 60;
  const elapsedSecs = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);
  const serverTimeTakenSecs = Math.max(1, Math.min(testDurationSecs, elapsedSecs));

  // Deterministically sort graded answers by questionId to guarantee identical lock ordering
  gradedAnswers.sort((a, b) => a.questionId.localeCompare(b.questionId));

  // Atomic Compare-And-Set & Update: Check and update status FIRST.
  // If this worker wins CAS, update answers within the same transaction.
  // If another worker won, cas.count is 0 -> return false immediately without locking answer rows.
  let didUpdate = false;
  try {
    didUpdate = await prisma.$transaction(
      async (tx) => {
        const cas = await tx.examAttempt.updateMany({
          where: {
            id: attemptId,
            OR: [
              { status: "IN_PROGRESS" },
              { status: "SUBMITTED", submittedAt: null },
            ],
          },
          data: {
            status: "SUBMITTED",
            submittedAt: now,
            score: totalScore,
            totalMarks: attempt.test?.totalMarks ?? 0,
            correctCount,
            wrongCount,
            skippedCount,
            markedCount,
            timeTakenSecs: serverTimeTakenSecs,
          },
        });

        if (cas.count === 0) {
          return false;
        }

        for (const ga of gradedAnswers) {
          await tx.examAttemptAnswer.update({
            where: {
              attemptId_questionId: {
                attemptId,
                questionId: ga.questionId,
              },
            },
            data: {
              isCorrect: ga.isCorrect,
              marksAwarded: ga.marksAwarded,
            },
          });
        }

        return true;
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );
  } catch (err) {
    // If concurrent transaction conflict occurred, fall back to stored result
    return getStoredResult(attemptId);
  }

  if (!didUpdate) {
    // Another concurrent worker committed first
    return getStoredResult(attemptId);
  }

  const ranking = await getAttemptRanking(attemptId);

  return {
    attemptId,
    testId: attempt.testId,
    userId: attempt.userId,
    score: totalScore,
    totalMarks: attempt.test?.totalMarks ?? 0,
    correctCount,
    wrongCount,
    skippedCount,
    markedCount,
    timeTakenSecs: serverTimeTakenSecs,
    percentile: ranking.percentile,
    allIndiaRank: ranking.rank,
    totalCandidates: ranking.totalCandidates,
  };
}
