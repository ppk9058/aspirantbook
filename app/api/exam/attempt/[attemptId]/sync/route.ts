import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { isExamBatchSyncEnabled } from "@/lib/exam-flags";
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

    // Enforce sequence ordering using the dedicated clientSeq column:
    // If existing record has newer/equal clientSeq, return storedSeq to let client catch up.
    if (answers.length > 0) {
      if (isExamBatchSyncEnabled()) {
        const questionIds = answers.map((a) => a.questionId);
        const existingRows = await prisma.examAttemptAnswer.findMany({
          where: { attemptId, questionId: { in: questionIds } },
          select: { questionId: true, clientSeq: true },
        });

        const staleAnswers = existingRows.filter(
          (r) => r.clientSeq !== null && r.clientSeq !== undefined && r.clientSeq > sequence
        );

        if (staleAnswers.length > 0) {
          const maxStoredSeq = Math.max(...staleAnswers.map((r) => r.clientSeq!));
          return NextResponse.json(
            {
              error: "Stale sequence: server has newer data",
              storedSeq: maxStoredSeq,
            },
            { status: 409 }
          );
        }

        const ids = answers.map(() => crypto.randomUUID());
        const qIds = answers.map((a) => a.questionId);
        const options = answers.map((a) => a.selectedOption);
        const markeds = answers.map((a) => a.isMarked ?? false);
        const seqs = answers.map(() => sequence);
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
              v.client_seq,
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
              "clientSeq" = EXCLUDED."clientSeq",
              "timeSpentSecs" = EXCLUDED."timeSpentSecs"
            WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
               OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
          `;

          if (typeof tabSwitchCount === "number") {
            await tx.examAttempt.update({
              where: { id: attemptId },
              data: { tabSwitchCount },
            });
          }
        });
      } else {
        let maxStoredSeq = 0;
        let hasStaleSequence = false;

        await prisma.$transaction(async (tx) => {
          for (const ans of answers) {
            const existing = await tx.examAttemptAnswer.findUnique({
              where: {
                attemptId_questionId: {
                  attemptId,
                  questionId: ans.questionId,
                },
              },
              select: { clientSeq: true },
            });

            if (existing && existing.clientSeq > sequence) {
              hasStaleSequence = true;
              maxStoredSeq = Math.max(maxStoredSeq, existing.clientSeq);
              continue;
            }

            maxStoredSeq = Math.max(maxStoredSeq, sequence);

            await tx.examAttemptAnswer.upsert({
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
            });
          }

          if (typeof tabSwitchCount === "number") {
            await tx.examAttempt.update({
              where: { id: attemptId },
              data: { tabSwitchCount },
            });
          }
        });

        if (hasStaleSequence) {
          return NextResponse.json(
            {
              error: "Stale sequence: server has newer data",
              storedSeq: maxStoredSeq,
            },
            { status: 409 }
          );
        }
      }
    } else if (typeof tabSwitchCount === "number") {
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: { tabSwitchCount },
      });
    }

    // Check deadline + 30s grace period:
    // If expired, do NOT discard answers with 410; grade the attempt and finalize it!
    const durationMinutes = attempt.test!.durationMinutes;
    const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
    const graceDeadlineMs = deadlineMs + 30 * 1000;

    if (Date.now() > graceDeadlineMs) {
      const graded = await gradeExamAttempt(attemptId, new Date());
      return NextResponse.json(
        {
          data: {
            synced: true,
            expired: true,
            status: "SUBMITTED",
            result: graded,
          },
        },
        { status: 200 }
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
