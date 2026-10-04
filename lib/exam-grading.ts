import { prisma } from "@/lib/prisma";

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
      const totalSubmitted = await prisma.examAttempt.count({
        where: { testId: attempt.testId, status: "SUBMITTED" },
      });

      const rank = await prisma.examAttempt.count({
        where: {
          testId: attempt.testId,
          status: "SUBMITTED",
          score: { gt: attempt.score ?? 0 },
        },
      });

      const percentile =
        totalSubmitted > 1
          ? parseFloat((((totalSubmitted - rank) / totalSubmitted) * 100).toFixed(2))
          : null;

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
        percentile,
        allIndiaRank: totalSubmitted > 1 ? rank + 1 : null,
        totalCandidates: totalSubmitted,
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

  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.examQuestion.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      correctOption: true,
      positiveMarks: true,
      negativeMarks: true,
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let markedCount = 0;

  const gradedAnswers = answers.map((ans) => {
    const question = questionMap.get(ans.questionId);
    if (!question) {
      return { questionId: ans.questionId, isCorrect: false, marksAwarded: 0 };
    }

    if (ans.isMarked) markedCount++;

    let isCorrect = false;
    let marksAwarded = 0;

    if (!ans.selectedOption) {
      skippedCount++;
      marksAwarded = 0;
    } else if (ans.selectedOption === question.correctOption) {
      isCorrect = true;
      correctCount++;
      marksAwarded = question.positiveMarks;
      totalScore += marksAwarded;
    } else {
      wrongCount++;
      marksAwarded = -question.negativeMarks;
      totalScore += marksAwarded;
    }

    return { questionId: ans.questionId, isCorrect, marksAwarded };
  });

  const testDurationSecs = (attempt.test?.durationMinutes || 120) * 60;
  const elapsedSecs = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);
  const serverTimeTakenSecs = Math.max(1, Math.min(testDurationSecs, elapsedSecs));

  // Atomic Compare-And-Set & Update: Set status, submittedAt, and scores TOGETHER in one transaction.
  // Recovers cleanly if previous worker crashed with status SUBMITTED and submittedAt null.
  const didUpdate = await prisma.$transaction(
    async (tx) => {
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

      return cas.count > 0;
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );

  if (!didUpdate) {
    // Another concurrent worker committed first
    return getStoredResult(attemptId);
  }

  const newTotalSubmitted = await prisma.examAttempt.count({
    where: { testId: attempt.testId, status: "SUBMITTED" },
  });

  const rank = await prisma.examAttempt.count({
    where: {
      testId: attempt.testId,
      status: "SUBMITTED",
      score: { gt: totalScore },
    },
  });

  const percentile =
    newTotalSubmitted > 1
      ? parseFloat((((newTotalSubmitted - rank) / newTotalSubmitted) * 100).toFixed(2))
      : null;

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
    percentile,
    allIndiaRank: newTotalSubmitted > 1 ? rank + 1 : null,
    totalCandidates: newTotalSubmitted,
  };
}
