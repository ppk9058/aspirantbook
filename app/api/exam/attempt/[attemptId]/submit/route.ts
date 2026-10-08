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
  const { attemptId } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      const graded = await gradeExamAttempt(attemptId);
      if (graded) {
        return NextResponse.json({ data: graded }, { status: 200 });
      }
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

    // Upsert all final answers
    if (answers.length > 0) {
      try {
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
      } catch (upsertErr) {
        // Under concurrent double-submit, a peer request may be writing answers concurrently.
        // We safely proceed to gradeExamAttempt which serializes grading idempotently.
      }
    }

    // Authoritative idempotent server-side grading
    const graded = await gradeExamAttempt(attemptId, now);
    if (!graded) {
      return NextResponse.json(
        { error: "Submission calculation is in progress, please retry in a moment", retryable: true },
        { status: 202 }
      );
    }

    return NextResponse.json({ data: graded }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/exam/attempt/:attemptId/submit]", error);
    try {
      const graded = await gradeExamAttempt(attemptId);
      if (graded) {
        return NextResponse.json({ data: graded }, { status: 200 });
      }
    } catch {}
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
