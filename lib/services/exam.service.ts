import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { canViewSolutions } from "@/lib/exam/access-control";
import { Viewer } from "@/lib/api/v1/viewer";
import {
  TestListItemDto,
  TestDetailDto,
  StartAttemptResponseDto,
  AttemptDetailDto,
  AttemptResultDto,
  AttemptSolutionsDto,
  AnswerItemSyncSchema,
} from "@aspirantbook/shared";
import { z } from "zod";

export async function getTestsList(
  viewer: Viewer,
  query: { seriesId?: string; goal?: string; cursor?: string; limit?: number }
): Promise<{ items: TestListItemDto[]; nextCursor?: string }> {
  const limit = Math.min(query.limit || 20, 50);

  const tests = await prisma.examTest.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      ...(query.seriesId ? { seriesId: query.seriesId } : {}),
      ...(query.goal ? { series: { category: query.goal } } : {}),
    },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      titleHi: true,
      durationMinutes: true,
      totalMarks: true,
      totalQuestions: true,
      accessMode: true,
      seriesId: true,
      createdAt: true,
      series: { select: { title: true } },
      attempts: viewer.userId
        ? {
            where: { userId: viewer.userId },
            select: { id: true, score: true, status: true },
            take: 1,
            orderBy: { startedAt: "desc" },
          }
        : false,
    },
  });

  let nextCursor: string | undefined = undefined;
  if (tests.length > limit) {
    const nextItem = tests.pop();
    nextCursor = nextItem?.id;
  }

  const items: TestListItemDto[] = tests.map((t) => {
    const latestAttempt = Array.isArray(t.attempts) && t.attempts.length > 0 ? t.attempts[0] : null;
    return {
      id: t.id,
      title: t.title,
      titleHi: t.titleHi,
      slug: t.id,
      durationMinutes: t.durationMinutes,
      totalMarks: t.totalMarks,
      totalQuestions: t.totalQuestions,
      isFree: t.accessMode === "FREE",
      seriesId: t.seriesId,
      seriesTitle: t.series?.title,
      myAttemptsCount: latestAttempt ? 1 : 0,
      latestScore: latestAttempt?.score ?? null,
      createdAt: t.createdAt.toISOString(),
    };
  });

  return { items, nextCursor };
}

export async function getTestDetail(viewer: Viewer, testId: string): Promise<TestDetailDto> {
  const test = await prisma.examTest.findUnique({
    where: { id: testId },
    select: {
      id: true,
      title: true,
      titleHi: true,
      instructions: true,
      durationMinutes: true,
      totalMarks: true,
      totalQuestions: true,
      positiveMarks: true,
      negativeMarks: true,
      accessMode: true,
      series: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  if (!test) {
    throw new Error("NOT_FOUND: Test not found");
  }

  const previousAttemptsRaw = viewer.userId
    ? await prisma.examAttempt.findMany({
        where: { testId, userId: viewer.userId, status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          score: true,
          totalMarks: true,
          percentile: true,
          allIndiaRank: true,
          submittedAt: true,
        },
      })
    : [];

  const previousAttempts = previousAttemptsRaw.map((a) => ({
    id: a.id,
    score: a.score,
    totalMarks: a.totalMarks,
    percentile: a.percentile,
    rank: a.allIndiaRank,
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
  }));

  return {
    id: test.id,
    title: test.title,
    titleHi: test.titleHi,
    slug: test.id,
    instructions: test.instructions,
    durationMinutes: test.durationMinutes,
    totalMarks: test.totalMarks,
    totalQuestions: test.totalQuestions,
    positiveMarksPerQuestion: test.positiveMarks,
    negativeMarksPerQuestion: test.negativeMarks,
    isFree: test.accessMode === "FREE",
    series: {
      id: test.series.id,
      title: test.series.title,
      logoUrl: test.series.thumbnailUrl,
    },
    previousAttempts,
  };
}

export async function startTestAttempt(
  viewer: Viewer,
  testId: string
): Promise<StartAttemptResponseDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to attempt tests");
  }

  const test = await prisma.examTest.findUnique({
    where: { id: testId },
    select: { id: true, durationMinutes: true, isPublished: true },
  });

  if (!test || !test.isPublished) {
    throw new Error("NOT_FOUND: Test not found or not currently available");
  }

  // Check for an active IN_PROGRESS attempt
  const activeAttempt = await prisma.examAttempt.findFirst({
    where: {
      userId: viewer.userId,
      testId,
      status: "IN_PROGRESS",
    },
    select: { id: true, startedAt: true },
  });

  if (activeAttempt) {
    const elapsedSecs = Math.floor((Date.now() - activeAttempt.startedAt.getTime()) / 1000);
    const totalSecs = test.durationMinutes * 60;
    const remaining = Math.max(0, totalSecs - elapsedSecs);

    return {
      attemptId: activeAttempt.id,
      testId,
      startedAt: activeAttempt.startedAt.toISOString(),
      serverNow: new Date().toISOString(),
      durationMinutes: test.durationMinutes,
      durationSeconds: remaining,
      resumed: true,
    };
  }

  // Create new attempt
  const newAttempt = await prisma.examAttempt.create({
    data: {
      userId: viewer.userId,
      testId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
    select: { id: true, startedAt: true },
  });

  return {
    attemptId: newAttempt.id,
    testId,
    startedAt: newAttempt.startedAt.toISOString(),
    serverNow: new Date().toISOString(),
    durationMinutes: test.durationMinutes,
    durationSeconds: test.durationMinutes * 60,
    resumed: false,
  };
}

export async function getAttemptDetail(
  viewer: Viewer,
  attemptId: string
): Promise<AttemptDetailDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to view exam attempt");
  }

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
          title: true,
          durationMinutes: true,
          sections: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  sectionId: true,
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
                  positiveMarks: true,
                  negativeMarks: true,
                  // NOTE: correctOption and explanations are INTENTIONALLY EXCLUDED here to prevent leakage
                },
              },
            },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOption: true,
          isMarked: true,
          timeSpentSecs: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND: Attempt not found");
  }

  // IDOR check: only the attempt owner or an ADMIN may view it
  if (attempt.userId !== viewer.userId && viewer.role !== "ADMIN") {
    throw new Error("FORBIDDEN: You do not have permission to view this exam attempt");
  }

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  const sections: AttemptDetailDto["sections"] = [];
  const questions: AttemptDetailDto["questions"] = [];

  let qNum = 1;
  for (const s of attempt.test.sections) {
    sections.push({
      id: s.id,
      name: s.title,
      order: s.order,
      totalQuestions: s.questions.length,
    });

    for (const q of s.questions) {
      const userAns = answerMap.get(q.id);
      const optionsEn = [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(
        (o): o is string => Boolean(o)
      );
      const optionsHi = [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(
        (o): o is string => Boolean(o)
      );

      questions.push({
        id: q.id,
        sectionId: s.id,
        sectionName: s.title,
        questionNumber: qNum++,
        textEn: q.questionEn,
        textHi: q.questionHi,
        optionsEn,
        optionsHi: optionsHi.length > 0 ? optionsHi : null,
        positiveMarks: q.positiveMarks,
        negativeMarks: q.negativeMarks,
        selectedOption: userAns?.selectedOption ?? null,
        isMarked: userAns?.isMarked ?? false,
        timeSpentSecs: userAns?.timeSpentSecs ?? 0,
      });
    }
  }

  const elapsedSecs = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
  const totalSecs = attempt.test.durationMinutes * 60;
  const timeRemainingSecs = Math.max(0, totalSecs - elapsedSecs);

  return {
    attemptId: attempt.id,
    testId: attempt.testId,
    testTitle: attempt.test.title,
    status: attempt.status as any,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    serverNow: new Date().toISOString(),
    durationMinutes: attempt.test.durationMinutes,
    timeRemainingSecs,
    sections,
    questions,
  };
}

export async function syncAttemptAnswers(
  viewer: Viewer,
  attemptId: string,
  answers: Array<z.infer<typeof AnswerItemSyncSchema>>,
  lastSequenceNumber: number
): Promise<{ syncedCount: number; lastSequenceNumber: number }> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to sync answers");
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      test: { select: { durationMinutes: true } },
    },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND: Attempt not found");
  }

  if (attempt.userId !== viewer.userId) {
    throw new Error("FORBIDDEN: Attempt belongs to another user");
  }

  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("BAD_REQUEST: Cannot sync answers on an already finalized attempt");
  }

  // Check deadline + 30s grace period:
  const durationMinutes = attempt.test?.durationMinutes ?? 60;
  const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
  const graceDeadlineMs = deadlineMs + 30 * 1000;

  if (Date.now() > graceDeadlineMs) {
    throw new Error("BAD_REQUEST: Attempt deadline has expired; answers are rejected");
  }

  // Monotonically and idempotently upsert each answer batch
  let syncedCount = 0;
  for (const a of answers) {
    const existing = await prisma.examAttemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: a.questionId,
        },
      },
      select: { clientSeq: true },
    });

    if (existing) {
      if (
        existing.clientSeq !== null &&
        existing.clientSeq !== undefined &&
        existing.clientSeq > a.sequenceNumber
      ) {
        // Monotonic guard: older sequence packet cannot overwrite newer answer
        continue;
      }
      await prisma.examAttemptAnswer.update({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: a.questionId,
          },
        },
        data: {
          selectedOption: a.selectedOption ?? null,
          ...(a.isMarked !== undefined ? { isMarked: a.isMarked } : {}),
          ...(a.timeSpentSecs !== undefined ? { timeSpentSecs: a.timeSpentSecs } : {}),
          clientSeq: a.sequenceNumber,
        },
      });
      syncedCount++;
    } else {
      await prisma.examAttemptAnswer.create({
        data: {
          attemptId,
          questionId: a.questionId,
          selectedOption: a.selectedOption ?? null,
          isMarked: a.isMarked ?? false,
          timeSpentSecs: a.timeSpentSecs ?? 0,
          clientSeq: a.sequenceNumber,
        },
      });
      syncedCount++;
    }
  }

  return {
    syncedCount,
    lastSequenceNumber,
  };
}

export async function submitTestAttempt(
  viewer: Viewer,
  attemptId: string,
  finalAnswers?: Array<z.infer<typeof AnswerItemSyncSchema>>
): Promise<AttemptResultDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to submit an attempt");
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      test: { select: { durationMinutes: true } },
    },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND: Attempt not found");
  }

  if (attempt.userId !== viewer.userId && viewer.role !== "ADMIN") {
    throw new Error("FORBIDDEN: Attempt belongs to another user");
  }

  // Idempotent submit: if already submitted, return the existing result
  if (attempt.status === "SUBMITTED") {
    return getAttemptResult(viewer, attemptId);
  }

  const durationMinutes = attempt.test?.durationMinutes ?? 60;
  const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
  const graceDeadlineMs = deadlineMs + 30 * 1000;
  const withinDeadline = Date.now() <= graceDeadlineMs;

  // If final answers provided in submit payload AND within deadline, sync them
  if (withinDeadline && finalAnswers && finalAnswers.length > 0 && attempt.status === "IN_PROGRESS") {
    for (const a of finalAnswers) {
      const existing = await prisma.examAttemptAnswer.findUnique({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: a.questionId,
          },
        },
        select: { clientSeq: true },
      });
      if (existing) {
        if (
          existing.clientSeq !== null &&
          existing.clientSeq !== undefined &&
          existing.clientSeq > a.sequenceNumber
        ) {
          continue;
        }
        await prisma.examAttemptAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: a.questionId,
            },
          },
          data: {
            selectedOption: a.selectedOption ?? null,
            ...(a.isMarked !== undefined ? { isMarked: a.isMarked } : {}),
            ...(a.timeSpentSecs !== undefined ? { timeSpentSecs: a.timeSpentSecs } : {}),
            clientSeq: a.sequenceNumber,
          },
        });
      } else {
        await prisma.examAttemptAnswer.create({
          data: {
            attemptId,
            questionId: a.questionId,
            selectedOption: a.selectedOption ?? null,
            isMarked: a.isMarked ?? false,
            timeSpentSecs: a.timeSpentSecs ?? 0,
            clientSeq: a.sequenceNumber,
          },
        });
      }
    }
  }

  // Authoritatively and atomically grade the attempt
  const graded = await gradeExamAttempt(attemptId);
  if (!graded) {
    throw new Error("INTERNAL_SERVER_ERROR: Failed to grade exam attempt");
  }

  return getAttemptResult(viewer, attemptId);
}

export async function getAttemptResult(
  viewer: Viewer,
  attemptId: string
): Promise<AttemptResultDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to view results");
  }

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
      test: { select: { title: true } },
    },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND: Attempt not found");
  }

  if (attempt.userId !== viewer.userId && viewer.role !== "ADMIN") {
    throw new Error("FORBIDDEN: You do not have access to these results");
  }

  const totalAttempted = attempt.correctCount + attempt.wrongCount;
  const accuracyPercentage =
    totalAttempted > 0 ? Math.round((attempt.correctCount / totalAttempted) * 100) : 0;

  return {
    attemptId: attempt.id,
    testId: attempt.testId,
    testTitle: attempt.test.title,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    skippedCount: attempt.skippedCount,
    markedCount: attempt.markedCount,
    accuracyPercentage,
    timeTakenSecs: attempt.timeTakenSecs,
    percentile: attempt.percentile,
    allIndiaRank: attempt.allIndiaRank,
    totalCandidates: 1,
    submittedAt: attempt.submittedAt?.toISOString() || new Date().toISOString(),
  };
}

export async function getAttemptSolutions(
  viewer: Viewer,
  attemptId: string
): Promise<AttemptSolutionsDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to view solutions");
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      testId: true,
      status: true,
      submittedAt: true,
      test: {
        select: {
          id: true,
          isLive: true,
          liveStartAt: true,
          liveEndAt: true,
          createdById: true,
          sections: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  sectionId: true,
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
                  correctOption: true,
                  explanationEn: true,
                  explanationHi: true,
                  positiveMarks: true,
                  negativeMarks: true,
                },
              },
            },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOption: true,
          isCorrect: true,
          marksAwarded: true,
          timeSpentSecs: true,
          isMarked: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND: Attempt not found");
  }

  // CRITICAL SECURITY RULE: Solutions are visible ONLY after the test is submitted
  if (attempt.status !== "SUBMITTED") {
    throw new Error("FORBIDDEN: Solutions and explanations become available only after test submission");
  }

  // Authoritative server-side access control via shared helper
  const decision = canViewSolutions(
    { id: viewer.userId, role: viewer.role },
    {
      id: attempt.test.id,
      isLive: attempt.test.isLive,
      liveStartAt: attempt.test.liveStartAt,
      liveEndAt: attempt.test.liveEndAt,
      createdById: attempt.test.createdById,
    },
    {
      id: attempt.id,
      userId: attempt.userId,
      testId: attempt.testId,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
    }
  );

  if (!decision.allowed) {
    throw new Error(`FORBIDDEN: ${decision.reason}`);
  }

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const questions: AttemptSolutionsDto["questions"] = [];

  let qNum = 1;
  for (const s of attempt.test.sections) {
    for (const q of s.questions) {
      const userAns = answerMap.get(q.id);
      const optionsEn = [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(
        (o): o is string => Boolean(o)
      );
      const optionsHi = [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(
        (o): o is string => Boolean(o)
      );

      questions.push({
        id: q.id,
        sectionId: s.id,
        sectionName: s.title,
        questionNumber: qNum++,
        textEn: q.questionEn,
        textHi: q.questionHi,
        optionsEn,
        optionsHi: optionsHi.length > 0 ? optionsHi : null,
        positiveMarks: q.positiveMarks,
        negativeMarks: q.negativeMarks,
        selectedOption: userAns?.selectedOption ?? null,
        isMarked: userAns?.isMarked ?? false,
        timeSpentSecs: userAns?.timeSpentSecs ?? 0,
        correctOption: q.correctOption,
        explanationEn: q.explanationEn,
        explanationHi: q.explanationHi,
        isCorrect: userAns?.isCorrect ?? false,
        marksAwarded: userAns?.marksAwarded ?? 0,
      });
    }
  }

  return {
    attemptId: attempt.id,
    testId: attempt.testId,
    questions,
  };
}
