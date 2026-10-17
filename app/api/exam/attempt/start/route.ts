import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt } from "@/lib/exam-grading";
import { checkTestAccess } from "@/lib/auth/entitlements";

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
    let test = await prisma.examTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        titleHi: true,
        durationMinutes: true,
        totalMarks: true,
        totalQuestions: true,
        positiveMarks: true,
        negativeMarks: true,
        testType: true,
        seriesId: true,
        accessMode: true,
        createdById: true,
        series: {
          select: {
            id: true,
            slug: true,
            title: true,
            examName: true,
            category: true,
            isPublished: true,
            createdById: true,
          },
        },
        isPublished: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            titleHi: true,
            order: true,
            positiveMarks: true,
            negativeMarks: true,
            timeLimitMins: true,
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
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
                questionType: true,
                subject: true,
                positiveMarks: true,
                negativeMarks: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      const isAdmin = session.user.role === "ADMIN";
      test = await prisma.examTest.findFirst({
        where: {
          AND: [
            {
              OR: [
                { seriesId: testId },
                { series: { slug: testId } },
              ],
            },
            ...(!isAdmin
              ? [
                  {
                    OR: [
                      { isPublished: true, series: { isPublished: true } },
                      { isPublished: true, testType: "PREVIOUS_YEAR" as any },
                      { isPublished: true, testType: "CURRENT_AFFAIRS" as any },
                      { createdById: session.user.id },
                      { series: { createdById: session.user.id } },
                    ],
                  },
                ]
              : []),
          ],
        },
        orderBy: [{ isPublished: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          titleHi: true,
          durationMinutes: true,
          totalMarks: true,
          totalQuestions: true,
          positiveMarks: true,
          negativeMarks: true,
          testType: true,
          seriesId: true,
          accessMode: true,
          createdById: true,
          series: {
            select: {
              id: true,
              slug: true,
              title: true,
              examName: true,
              category: true,
              isPublished: true,
              createdById: true,
            },
          },
          isPublished: true,
          sections: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              titleHi: true,
              order: true,
              positiveMarks: true,
              negativeMarks: true,
              timeLimitMins: true,
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
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
                  questionType: true,
                  subject: true,
                  positiveMarks: true,
                  negativeMarks: true,
                  order: true,
                },
              },
            },
          },
        },
      });
    }

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const resolvedTestId = test.id;

    const isAdmin = session.user.role === "ADMIN";
    const isOwner =
      test.createdById === session.user.id ||
      (test.series && test.series.createdById === session.user.id);
    const isPrivileged = isOwner || isAdmin;

    if (!isPrivileged) {
      const isSystemBypassTest =
        test.testType === "PREVIOUS_YEAR" || test.testType === "CURRENT_AFFAIRS";
      if (test.series && !test.series.isPublished && !isSystemBypassTest) {
        return NextResponse.json(
          { error: "Test series is not published yet" },
          { status: 404 }
        );
      }
      if (!test.isPublished) {
        return NextResponse.json(
          { error: "Test is not published yet" },
          { status: 403 }
        );
      }
    }

    // 2. Check entitlement (Free vs Pro)
    const access = await checkTestAccess(session.user.id, test.id, session.user.role as any);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.message || "This test requires an active Pass or subscription", reason: access.reason },
        { status: 403 }
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
          testId: resolvedTestId,
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
            // Set status to SUBMITTED with submittedAt: null so gradeExamAttempt can recover and finalize it later
            await prisma.examAttempt
              .update({
                where: { id: oa.id },
                data: { status: "SUBMITTED", submittedAt: null },
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
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":" + resolvedTestId}))`;

        // Check for an existing active IN_PROGRESS attempt
        const existing = await tx.examAttempt.findFirst({
          where: {
            userId,
            testId: resolvedTestId,
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
            testId: resolvedTestId,
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
          test: {
            id: test.id,
            title: test.title,
            titleHi: test.titleHi,
            durationMinutes: test.durationMinutes,
            totalMarks: test.totalMarks,
            totalQuestions: test.totalQuestions,
            positiveMarks: test.positiveMarks,
            negativeMarks: test.negativeMarks,
            series: test.series,
            sections: test.sections,
          },
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
