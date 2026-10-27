import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { gradeExamAttempt } from "@/lib/exam-grading";
import { DEADLINE_EXPIRED_MESSAGE, examDeadline } from "@/lib/exam-deadline";

interface AnswerPayload {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D" | null;
  isMarked: boolean;
  timeSpentSecs?: number;
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

    // Verify attempt ownership and deadline
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        test: {
          select: { durationMinutes: true },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Attempt already submitted" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const {
      answers,
      tabSwitchCount,
      sequence = 0,
    }: {
      answers: AnswerPayload[];
      tabSwitchCount?: number;
      clientTimestamp?: number;
      sequence?: number;
    } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers must be an array" },
        { status: 400 }
      );
    }

    // A14: the shared deadline policy is checked BEFORE any write. Late
    // answers are never persisted; the attempt is graded and finalized so the
    // learner still gets a result (the timer ran out mid-sync).
    const deadline = examDeadline(
      { startedAt: attempt.startedAt, durationMinutes: attempt.test?.durationMinutes ?? 60 },
      new Date()
    );
    if (deadline.expired) {
      const graded = await gradeExamAttempt(attemptId, new Date());
      return NextResponse.json(
        {
          data: {
            synced: false,
            rejected: answers.length,
            expired: true,
            status: "SUBMITTED",
            error: DEADLINE_EXPIRED_MESSAGE,
            result: graded,
          },
        },
        { status: 200 }
      );
    }

    // A14: one batched read replaces the per-answer findUnique N+1; the
    // upserts still run inside a single transaction with the stale-sequence
    // guard.
    let hasStaleSequence = false;
    let maxStoredSeq = 0;

    if (answers.length > 0) {
      const questionIds = Array.from(
        new Set(answers.map((ans) => ans.questionId))
      );

      const existingRows = await prisma.examAttemptAnswer.findMany({
        where: { attemptId, questionId: { in: questionIds } },
        select: { questionId: true, clientSeq: true },
      });
      const storedSeqByQuestion = new Map(
        existingRows.map((row) => [row.questionId, row.clientSeq])
      );

      const operations: Prisma.PrismaPromise<any>[] = [];

      for (const ans of answers) {
        const storedSeq = storedSeqByQuestion.get(ans.questionId) ?? null;
        if (storedSeq !== null && storedSeq !== undefined && storedSeq > sequence) {
          hasStaleSequence = true;
          maxStoredSeq = Math.max(maxStoredSeq, storedSeq);
          continue;
        }

        maxStoredSeq = Math.max(maxStoredSeq, sequence);

        operations.push(
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
              clientSeq: sequence,
              timeSpentSecs: ans.timeSpentSecs ?? 0,
            },
            update: {
              selectedOption: ans.selectedOption,
              isMarked: ans.isMarked ?? false,
              clientSeq: sequence,
              timeSpentSecs: ans.timeSpentSecs ?? 0,
            },
          })
        );
      }

      if (typeof tabSwitchCount === "number") {
        operations.push(
          prisma.examAttempt.update({
            where: { id: attemptId },
            data: { tabSwitchCount },
          })
        );
      }

      if (operations.length > 0) {
        await prisma.$transaction(operations);
      }
    } else if (typeof tabSwitchCount === "number") {
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: { tabSwitchCount },
      });
    }

    if (hasStaleSequence) {
      return NextResponse.json(
        {
          error: "Stale sequence: server has newer data",
          storedSeq: maxStoredSeq,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { data: { synced: true, count: answers.length } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/exam/attempt/:attemptId/sync]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
