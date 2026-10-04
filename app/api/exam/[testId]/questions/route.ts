import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await params;
    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    let test: any = null;

    try {
      test = await prisma.examTest.findUnique({
        where: { id: testId },
        include: {
          series: {
            select: { id: true, slug: true, title: true },
          },
          sections: {
            orderBy: { order: "asc" },
            include: {
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
    } catch (dbErr) {
      console.error("[EXAM_QUESTIONS_DB_ERROR]", dbErr);
      return NextResponse.json({ error: "Failed to fetch test questions" }, { status: 500 });
    }

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (!test.isPublished) {
      const isCreator = test.createdById === session.user.id;
      const isAdmin = (session.user as any).role === "ADMIN";
      if (!isCreator && !isAdmin) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
    }

    const { searchParams } = new URL(_req.url);
    const metadataOnly =
      searchParams.get("metadataOnly") === "1" ||
      searchParams.get("metadata") === "true";
    const attemptId = searchParams.get("attemptId");

    const role = (session.user as any).role;
    const isAdmin = role === "ADMIN";
    const isTeacherOwner =
      role === "TEACHER" && test.createdById === session.user.id;

    if (metadataOnly) {
      const data = {
        test: {
          id: test.id,
          title: test.title,
          titleHi: test.titleHi,
          durationMinutes: test.durationMinutes,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
          positiveMarks: test.positiveMarks,
          negativeMarks: test.negativeMarks,
          sections: test.sections.map((section: any) => ({
            id: section.id,
            title: section.title,
            titleHi: section.titleHi,
            questionCount: section.questions?.length ?? 0,
          })),
        },
      };
      return NextResponse.json({ data }, { status: 200 });
    }

    // Full questions: only allowed for ADMIN, author TEACHER, or student with active IN_PROGRESS attempt
    if (!isAdmin && !isTeacherOwner) {
      if (!attemptId) {
        return NextResponse.json(
          { error: "Forbidden: An active attempt is required to view test questions" },
          { status: 403 }
        );
      }

      const activeAttempt = await prisma.examAttempt.findFirst({
        where: {
          id: attemptId,
          userId: session.user.id,
          testId: test.id,
          status: "IN_PROGRESS",
        },
        select: {
          id: true,
          startedAt: true,
        },
      });

      if (!activeAttempt) {
        return NextResponse.json(
          { error: "Forbidden: No active attempt found for this test" },
          { status: 403 }
        );
      }

      const durationMinutes = test.durationMinutes || 120;
      const graceDeadlineMs =
        activeAttempt.startedAt.getTime() +
        durationMinutes * 60 * 1000 +
        30 * 1000;
      if (Date.now() > graceDeadlineMs) {
        return NextResponse.json(
          { error: "Forbidden: Attempt time has expired" },
          { status: 403 }
        );
      }
    }

    const data = {
      test: {
        id: test.id,
        title: test.title,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        positiveMarks: test.positiveMarks,
        negativeMarks: test.negativeMarks,
        sections: test.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          questions: section.questions,
        })),
      },
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/exam/:testId/questions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
