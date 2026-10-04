import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { testId, language, retake } = body as {
      testId?: string;
      language?: "English" | "Hindi";
      retake?: boolean;
    };

    if (!testId || typeof testId !== "string") {
      return NextResponse.json(
        { error: "testId is required" },
        { status: 400 }
      );
    }

    if (!language || !["English", "Hindi"].includes(language)) {
      return NextResponse.json(
        { error: "language must be 'English' or 'Hindi'" },
        { status: 400 }
      );
    }

    // Verify the test exists and fetch duration and seriesId
    const test = await prisma.examTest.findUnique({
      where: { id: testId },
      select: { id: true, durationMinutes: true, seriesId: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const durationMinutes = test.durationMinutes || 120;
    const nowMs = Date.now();

    // Use transaction to prevent race conditions on double-click
    const result = await prisma.$transaction(async (tx) => {
      // If retake requested, finalize any open attempts first
      if (retake) {
        await tx.examAttempt.updateMany({
          where: {
            userId,
            testId,
            status: "IN_PROGRESS",
          },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        });
      } else {
        // Check for an existing IN_PROGRESS attempt
        const existing = await tx.examAttempt.findFirst({
          where: {
            userId,
            testId,
            status: "IN_PROGRESS",
          },
          select: {
            id: true,
            startedAt: true,
            testId: true,
            tabSwitchCount: true,
            answers: {
              select: {
                questionId: true,
                selectedOption: true,
                isMarked: true,
                timeSpentSecs: true,
              },
            },
          },
          orderBy: { startedAt: "desc" },
        });

        if (existing) {
          const startedAtMs = existing.startedAt.getTime();
          const deadlineMs = startedAtMs + durationMinutes * 60 * 1000;
          const graceDeadlineMs = deadlineMs + 30 * 1000;

          // Never resume an expired attempt
          if (nowMs > graceDeadlineMs) {
            await tx.examAttempt.update({
              where: { id: existing.id },
              data: {
                status: "SUBMITTED",
                submittedAt: new Date(),
              },
            });
          } else {
            // Valid active attempt: resume preserving original startedAt
            const deadline = new Date(deadlineMs).toISOString();
            return {
              resumed: true,
              attemptId: existing.id,
              startedAt: existing.startedAt,
              deadline,
              durationMinutes,
              testId: existing.testId,
              seriesId: test.seriesId,
              tabSwitchCount: existing.tabSwitchCount,
              answers: existing.answers,
              status: 200,
            };
          }
        }
      }

      // Create a brand new attempt
      const attempt = await tx.examAttempt.create({
        data: {
          userId,
          testId,
          language,
          status: "IN_PROGRESS",
        },
        select: {
          id: true,
          startedAt: true,
          testId: true,
        },
      });

      const deadline = new Date(
        attempt.startedAt.getTime() + durationMinutes * 60 * 1000
      ).toISOString();

      return {
        resumed: false,
        attemptId: attempt.id,
        startedAt: attempt.startedAt,
        deadline,
        durationMinutes,
        testId: attempt.testId,
        seriesId: test.seriesId,
        tabSwitchCount: 0,
        status: 201,
      };
    });

    return NextResponse.json(
      {
        data: {
          attemptId: result.attemptId,
          startedAt: result.startedAt,
          deadline: result.deadline,
          durationMinutes: result.durationMinutes,
          testId: result.testId,
          seriesId: result.seriesId,
          tabSwitchCount: result.tabSwitchCount,
          resumed: result.resumed,
          answers: (result as any).answers,
        },
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("[POST /api/exam/attempt/start]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
