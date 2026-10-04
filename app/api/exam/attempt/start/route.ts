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

    // 2. Use transaction with sensible timeout and PostgreSQL advisory lock to serialize start requests
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":" + testId}))`;

        // If retake requested, grade or finalize any existing open attempt first
        if (retake) {
          const openAttempts = await tx.examAttempt.findMany({
            where: {
              userId,
              testId,
              status: "IN_PROGRESS",
            },
            select: { id: true },
          });

          for (const oa of openAttempts) {
            try {
              await gradeExamAttempt(oa.id, serverNow);
            } catch (err) {
              console.error(`[start] Graceful fallback on retake for attempt ${oa.id}:`, err);
              await tx.examAttempt.update({
                where: { id: oa.id },
                data: { status: "SUBMITTED", submittedAt: serverNow },
              });
            }
          }
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

            // Never resume an expired attempt; grade it or gracefully finalize it
            if (nowMs > graceDeadlineMs) {
              try {
                await gradeExamAttempt(existing.id, serverNow);
              } catch (gradeErr) {
                console.error(
                  `[start] Graceful fallback: failed to grade expired attempt ${existing.id}:`,
                  gradeErr
                );
                await tx.examAttempt.update({
                  where: { id: existing.id },
                  data: { status: "SUBMITTED", submittedAt: serverNow },
                });
              }
            } else {
              // Valid active attempt: resume preserving original startedAt
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
        maxWait: 10000,
        timeout: 15000,
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
