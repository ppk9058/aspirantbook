import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Check deadline + 30s grace period
    const durationMinutes = attempt.test?.durationMinutes || 120;
    const deadlineMs = attempt.startedAt.getTime() + durationMinutes * 60 * 1000;
    const graceDeadlineMs = deadlineMs + 30 * 1000;

    if (Date.now() > graceDeadlineMs) {
      return NextResponse.json(
        { error: "Attempt window has closed. The test duration and grace period have expired." },
        { status: 410 }
      );
    }

    const body = await req.json();
    const {
      answers,
      tabSwitchCount,
    }: { answers: AnswerPayload[]; tabSwitchCount?: number; clientTimestamp?: number; sequence?: number } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers must be an array" },
        { status: 400 }
      );
    }

    // If answers provided, upsert them
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
    }

    // Update tabSwitchCount if provided
    if (typeof tabSwitchCount === "number") {
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: { tabSwitchCount },
      });
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
