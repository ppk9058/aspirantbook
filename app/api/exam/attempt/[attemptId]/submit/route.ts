import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";

interface AnswerPayload {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D" | null;
  isMarked: boolean;
  timeSpentSecs: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    // Verify attempt ownership and fetch test duration
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        status: true,
        testId: true,
        score: true,
        totalMarks: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        timeTakenSecs: true,
        startedAt: true,
        test: {
          select: {
            id: true,
            durationMinutes: true,
            totalMarks: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already submitted, return existing result idempotently without re-grading
    if (attempt.status === "SUBMITTED") {
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
          ? parseFloat(
              (((totalSubmitted - rank) / totalSubmitted) * 100).toFixed(2)
            )
          : null;

      return NextResponse.json(
        {
          data: {
            attemptId: attempt.id,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            correctCount: attempt.correctCount,
            wrongCount: attempt.wrongCount,
            skippedCount: attempt.skippedCount,
            timeTakenSecs: attempt.timeTakenSecs,
            percentile,
            allIndiaRank: totalSubmitted > 1 ? rank + 1 : null,
            totalCandidates: totalSubmitted,
          },
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const { answers }: { answers: AnswerPayload[] } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers must be an array" },
        { status: 400 }
      );
    }

    // Check server deadline with ~30s grace period.
    // If expired: do NOT discard answers with 410! Upsert final answers, grade the attempt, and return the result.
    const durationMinutes = attempt.test?.durationMinutes || 120;
    const testDurationSecs = durationMinutes * 60;
    const deadlineMs = attempt.startedAt.getTime() + testDurationSecs * 1000;
    const graceDeadlineMs = deadlineMs + 30 * 1000;
    const now = new Date();

    if (now.getTime() > graceDeadlineMs) {
      if (answers.length > 0) {
        await prisma.$transaction(
          answers.map((ans) =>
            prisma.examAttemptAnswer.upsert({
              where: {
                attemptId_questionId: {
                  attemptId,
                  questionId: ans.questionId,
                },
              },
              create: {
                attemptId,
                questionId: ans.questionId,
                selectedOption: ans.selectedOption,
                isMarked: ans.isMarked ?? false,
                timeSpentSecs: 0,
              },
              update: {
                selectedOption: ans.selectedOption,
                isMarked: ans.isMarked ?? false,
              },
            })
          )
        );
      }
      const graded = await gradeExamAttempt(attemptId, now);
      if (!graded) {
        return NextResponse.json(
          { error: "Submission calculation is in progress, please retry in a moment", retryable: true },
          { status: 202 }
        );
      }
      return NextResponse.json({ data: graded }, { status: 200 });
    }

    // Server owns timeTaken: ignore any client timeTakenSecs
    const serverTimeTakenSecs = Math.max(
      1,
      Math.min(
        testDurationSecs,
        Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)
      )
    );

    // Upsert all final answers
    await prisma.$transaction(
      answers.map((ans) =>
        prisma.examAttemptAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: ans.questionId,
            },
          },
          create: {
            attemptId,
            questionId: ans.questionId,
            selectedOption: ans.selectedOption,
            isMarked: ans.isMarked ?? false,
            timeSpentSecs: ans.timeSpentSecs ?? 0,
          },
          update: {
            selectedOption: ans.selectedOption,
            isMarked: ans.isMarked ?? false,
            timeSpentSecs: ans.timeSpentSecs ?? 0,
          },
        })
      )
    );

    // Fetch all questions for grading (with correctOption)
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

    // Grade each answer
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
        // Skipped
        skippedCount++;
        marksAwarded = 0;
      } else if (ans.selectedOption === question.correctOption) {
        // Correct
        isCorrect = true;
        correctCount++;
        marksAwarded = question.positiveMarks;
        totalScore += marksAwarded;
      } else {
        // Wrong
        wrongCount++;
        marksAwarded = -(question.negativeMarks);
        totalScore += marksAwarded;
      }

      return { questionId: ans.questionId, isCorrect, marksAwarded };
    });

    // Fetch test totalMarks
    const test = await prisma.examTest.findUnique({
      where: { id: attempt.testId },
      select: { totalMarks: true },
    });

    // Update each answer's grading result
    await prisma.$transaction(
      gradedAnswers.map(({ questionId, isCorrect, marksAwarded }) =>
        prisma.examAttemptAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId,
            },
          },
          data: { isCorrect, marksAwarded },
        })
      )
    );

    // Mark attempt as SUBMITTED
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        score: totalScore,
        totalMarks: test?.totalMarks ?? attempt.test?.totalMarks ?? 0,
        correctCount,
        wrongCount,
        skippedCount,
        markedCount,
        timeTakenSecs: serverTimeTakenSecs,
        submittedAt: now,
      },
    });

    // Calculate percentile
    const totalSubmitted = await prisma.examAttempt.count({
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
      totalSubmitted > 1
        ? parseFloat(
            (((totalSubmitted - rank) / totalSubmitted) * 100).toFixed(2)
          )
        : null;

    return NextResponse.json(
      {
        data: {
          attemptId,
          score: totalScore,
          totalMarks: test?.totalMarks ?? attempt.test?.totalMarks ?? 0,
          correctCount,
          wrongCount,
          skippedCount,
          timeTakenSecs: serverTimeTakenSecs,
          percentile,
          allIndiaRank: totalSubmitted > 1 ? rank + 1 : null,
          totalCandidates: totalSubmitted,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/exam/attempt/:attemptId/submit]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
