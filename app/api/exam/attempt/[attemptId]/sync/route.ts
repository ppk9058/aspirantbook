import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { isExamBatchSyncEnabled } from "@/lib/exam-flags";
import { DEADLINE_EXPIRED_MESSAGE, examDeadline } from "@/lib/exam-deadline";
import crypto from "crypto";

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

    const safeSequence = sequence ?? 0;

    // P0-1 / A14: the shared deadline policy is checked BEFORE any write. Late
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

    let hasStaleSequence = false;
    let maxStoredSeq = 0;

    if (answers.length > 0) {
      const questionIds = Array.from(new Set(answers.map((a) => a.questionId)));
      const existingRows = await prisma.examAttemptAnswer.findMany({
        where: { attemptId, questionId: { in: questionIds } },
        select: { questionId: true, clientSeq: true },
      });

      const staleAnswers = existingRows.filter(
        (r) => r.clientSeq !== null && r.clientSeq !== undefined && r.clientSeq > safeSequence
      );

      if (staleAnswers.length > 0) {
        maxStoredSeq = Math.max(...staleAnswers.map((r) => r.clientSeq!));
        return NextResponse.json(
          {
            error: "Stale sequence: server has newer data",
            storedSeq: maxStoredSeq,
          },
          { status: 409 }
        );
      }

      if (isExamBatchSyncEnabled()) {
        const ids = answers.map(() => crypto.randomUUID());
        const qIds = answers.map((a) => a.questionId);
        const options = answers.map((a) => a.selectedOption);
        const markeds = answers.map((a) => a.isMarked ?? false);
        const seqs = answers.map(() => safeSequence);
        const times = answers.map((a) => a.timeSpentSecs ?? 0);

        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
            SELECT
              v.id,
              ${attemptId},
              v.question_id,
              v.selected_option,
              v.is_marked,
              COALESCE(v.client_seq, 0),
              v.time_spent_secs
            FROM UNNEST(
              ${ids}::text[],
              ${qIds}::text[],
              ${options}::text[],
              ${markeds}::boolean[],
              ${seqs}::int[],
              ${times}::int[]
            ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
            ON CONFLICT ("attemptId", "questionId")
            DO UPDATE SET
              "selectedOption" = EXCLUDED."selectedOption",
              "isMarked" = EXCLUDED."isMarked",
              "clientSeq" = COALESCE(EXCLUDED."clientSeq", 0),
              "timeSpentSecs" = EXCLUDED."timeSpentSecs"
            WHERE COALESCE("ExamAttemptAnswer"."clientSeq", 0) <= COALESCE(EXCLUDED."clientSeq", 0);
          `;

          if (typeof tabSwitchCount === "number") {
            await tx.examAttempt.update({
              where: { id: attemptId },
              data: { tabSwitchCount },
            });
          }
        });
      } else {
        const storedSeqByQuestion = new Map(
          existingRows.map((row) => [row.questionId, row.clientSeq])
        );

        const operations: Prisma.PrismaPromise<any>[] = [];

        for (const ans of answers) {
          const storedSeq = storedSeqByQuestion.get(ans.questionId) ?? null;
          if (storedSeq !== null && storedSeq !== undefined && storedSeq > safeSequence) {
            hasStaleSequence = true;
            maxStoredSeq = Math.max(maxStoredSeq, storedSeq);
            continue;
          }

          maxStoredSeq = Math.max(maxStoredSeq, safeSequence);

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
                clientSeq: safeSequence,
                timeSpentSecs: ans.timeSpentSecs ?? 0,
              },
              update: {
                selectedOption: ans.selectedOption,
                isMarked: ans.isMarked ?? false,
                clientSeq: safeSequence,
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
