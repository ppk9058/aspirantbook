import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";

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

    // 1. Validate test exists, is published, has positive duration, and has questions
    const test = await prisma.examTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        durationMinutes: true,
        seriesId: true,
        series: {
          select: {
            id: true,
            slug: true,
          },
        },
        isPublished: true,
        sections: {
          select: {
            questions: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (!test.isPublished) {
      return NextResponse.json(
        { error: "Test is not published yet" },
        { status: 409 }
      );
    }

    if (!test.durationMinutes || test.durationMinutes <= 0) {
      return NextResponse.json(
        { error: "Test has an invalid duration" },
        { status: 422 }
      );
    }

    const hasQuestions = test.sections.some((sec) => sec.questions.length > 0);
    if (!hasQuestions) {
      return NextResponse.json(
        { error: "This test does not contain any questions" },
        { status: 422 }
      );
    }

    const userId = session.user.id;
    const durationMinutes = test.durationMinutes;
    const nowMs = Date.now();
    const serverNow = new Date();

    // 2. OUTSIDE the transaction: find and grade/finalize any expired or retaken attempts first.
    // Keeping grading outside avoids holding PgBouncer connections and transactions open during grading.
    try {
      const openAttempts = await prisma.examAttempt.findMany({
        where: {
          userId,
          testId,
          status: "IN_PROGRESS",
        },
        select: {
          id: true,
          startedAt: true,
        },
      });

      for (const oa of openAttempts) {
        const startedAtMs = oa.startedAt.getTime();
        const deadlineMs = startedAtMs + durationMinutes * 60 * 1000;
        const graceDeadlineMs = deadlineMs + 30 * 1000;

        if (retake || nowMs > graceDeadlineMs) {
          try {
            await gradeExamAttempt(oa.id, serverNow);
          } catch (gradeErr) {
            console.error(`[start] Graceful fallback: failed to grade attempt ${oa.id}:`, gradeErr);
            // Ensure status is marked SUBMITTED so it never stays stuck in IN_PROGRESS
            await prisma.examAttempt
              .update({
                where: { id: oa.id },
                data: { status: "SUBMITTED", submittedAt: serverNow },
              })
              .catch((e) => console.error(`[start] Fallback status update failed for ${oa.id}:`, e));
          }
        }
      }
    } catch (cleanupErr) {
      console.error("[start] Failed to inspect or finalize prior attempts (continuing):", cleanupErr);
    }

    // 3. Short, lean transaction: Take advisory lock, verify/resume active attempt or create brand new one.
    // No grading or heavy queries inside this transaction.
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":" + testId}))`;

        // Check for an existing active IN_PROGRESS attempt
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
                clientSeq: true,
              },
            },
          },
          orderBy: { startedAt: "desc" },
        });

        if (existing) {
          const startedAtMs = existing.startedAt.getTime();
          const deadlineMs = startedAtMs + durationMinutes * 60 * 1000;
          const graceDeadlineMs = deadlineMs + 30 * 1000;

          // If still within deadline and not retake, resume active attempt
          if (Date.now() <= graceDeadlineMs && !retake) {
            const deadline = new Date(deadlineMs).toISOString();
            const maxClientSeq = existing.answers.reduce(
              (max, a) => Math.max(max, a.clientSeq || 0),
              0
            );

            return {
              resumed: true,
              attemptId: existing.id,
              startedAt: existing.startedAt,
              deadline,
              serverNow: serverNow.toISOString(),
              durationMinutes,
              testId: existing.testId,
              seriesId: test.seriesId,
              seriesSlug: test.series?.slug,
              tabSwitchCount: existing.tabSwitchCount,
              answers: existing.answers,
              maxClientSeq,
              status: 200,
            };
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
          serverNow: serverNow.toISOString(),
          durationMinutes,
          testId: attempt.testId,
          seriesId: test.seriesId,
          seriesSlug: test.series?.slug,
          tabSwitchCount: 0,
          status: 201,
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json(
      {
        data: {
          attemptId: result.attemptId,
          startedAt: result.startedAt,
          deadline: result.deadline,
          serverNow: result.serverNow,
          durationMinutes: result.durationMinutes,
          testId: result.testId,
          seriesId: result.seriesId,
          seriesSlug: (result as any).seriesSlug,
          tabSwitchCount: result.tabSwitchCount,
          resumed: result.resumed,
          answers: (result as any).answers,
          maxClientSeq: (result as any).maxClientSeq ?? 0,
        },
      },
      { status: result.status }
    );
  } catch (error: any) {
    console.error("[POST /api/exam/attempt/start]", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
