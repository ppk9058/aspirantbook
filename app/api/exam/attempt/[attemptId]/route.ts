import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
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

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        testId: true,
        status: true,
        language: true,
        startedAt: true,
        submittedAt: true,
        tabSwitchCount: true,
        test: {
          select: {
            id: true,
            title: true,
            titleHi: true,
            durationMinutes: true,
            totalMarks: true,
            totalQuestions: true,
            positiveMarks: true,
            negativeMarks: true,
            seriesId: true,
            series: {
              select: {
                id: true,
                slug: true,
              },
            },
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
        },
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
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const durationMinutes = attempt.test!.durationMinutes;
    const deadline = new Date(
      attempt.startedAt.getTime() + durationMinutes * 60 * 1000
    ).toISOString();

    const maxClientSeq = attempt.answers.reduce(
      (max, a) => Math.max(max, a.clientSeq || 0),
      0
    );

    return NextResponse.json(
      {
        data: {
          attemptId: attempt.id,
          testId: attempt.testId,
          seriesId: attempt.test?.seriesId,
          seriesSlug: attempt.test?.series?.slug,
          status: attempt.status,
          language: attempt.language,
          startedAt: attempt.startedAt.toISOString(),
          deadline,
          serverNow: new Date().toISOString(),
          durationMinutes,
          tabSwitchCount: attempt.tabSwitchCount,
          test: attempt.test,
          answers: attempt.answers,
          maxClientSeq,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/exam/attempt/:attemptId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
