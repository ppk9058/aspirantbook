import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getStudentGoals, parseGoalIds } from "@/lib/goals/student-goals";
import { applyQuizGoalFilter } from "@/lib/goals/goal-filters";

function mapQuestion(q: any, idx: number) {
  return {
    id: idx + 1,
    text: q.questionEn,
    textHi: q.questionHi,
    options: [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(Boolean),
    optionsHi: [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(Boolean),
    subject: q.subject || "General Studies",
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = role === "ADMIN";
    const isTeacher = role === "TEACHER";

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId");
    const category = searchParams.get("category");
    const includeAll = searchParams.get("includeAll") === "true";
    const includeQuestions =
      (isAdmin || isTeacher) && searchParams.get("includeQuestions") === "1";

    const conditions: any[] = [];

    if (isAdmin) {
      // Admin sees both published and drafts
    } else if (isTeacher) {
      // Teacher sees published + tests they created
      conditions.push({
        OR: [
          { isPublished: true },
          { createdById: session?.user?.id ?? "" },
        ],
      });
    } else {
      // Students/free users see published only
      conditions.push({ isPublished: true });
    }

    if (seriesId) {
      conditions.push({
        OR: [
          { seriesId: seriesId },
          { series: { slug: seriesId } },
          { id: seriesId },
        ],
      });
    }

    if (category) {
      conditions.push({
        OR: [
          { series: { category: { contains: category, mode: "insensitive" } } },
          { series: { slug: { contains: category, mode: "insensitive" } } },
          { series: { title: { contains: category, mode: "insensitive" } } },
          { title: { contains: category, mode: "insensitive" } },
          { testType: "CURRENT_AFFAIRS" },
        ],
      });
    }

    const tests = await prisma.examTest.findMany({
      where: conditions.length > 0 ? { AND: conditions } : {},
      select: {
        id: true,
        seriesId: true,
        title: true,
        titleHi: true,
        testType: true,
        month: true,
        year: true,
        totalQuestions: true,
        totalMarks: true,
        durationMinutes: true,
        accessMode: true,
        isPublished: true,
        createdById: true,
        _count: {
          select: {
            attempts: {
              where: {
                user: {
                  role: {
                    notIn: ["TEACHER", "ADMIN"],
                  },
                },
              },
            },
          },
        },
        attempts: {
          where: {
            user: {
              role: {
                notIn: ["TEACHER", "ADMIN"],
              },
            },
            status: "SUBMITTED",
          },
          select: {
            score: true,
            totalMarks: true,
          },
        },
        series: {
          select: { title: true, category: true, slug: true, isFree: true, isPro: true, languages: true },
        },
        ...(includeQuestions
          ? {
              sections: {
                orderBy: { order: "asc" as const },
                select: {
                  id: true,
                  title: true,
                  questions: {
                    orderBy: { order: "asc" as const },
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
                      subject: true,
                    },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = tests.map((t: any) => {
      const qCount = includeQuestions
        ? (t.sections || []).reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0)
        : 0;
      const isFreeSample = Boolean(t.series?.isPro && t.accessMode === "FREE");
      const submittedAttempts = t.attempts || [];
      const avgScore =
        submittedAttempts.length > 0
          ? Math.round(
              (submittedAttempts.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) /
                submittedAttempts.length) *
                10
            ) / 10
          : 0;
      return {
        id: t.id,
        seriesId: t.seriesId,
        seriesSlug: t.series?.slug || t.seriesId,
        seriesTitle: t.series?.title,
        category: t.series?.category,
        title: t.title,
        titleHi: t.titleHi,
        testType: t.testType,
        month: t.month,
        year: t.year,
        questions: t.totalQuestions,
        marks: t.totalMarks,
        durationMinutes: t.durationMinutes,
        languages: t.series?.languages,
        accessMode: t.accessMode,
        isFree: t.accessMode === "FREE",
        seriesIsPro: Boolean(t.series?.isPro),
        seriesIsFree: Boolean(t.series?.isFree),
        isFreeSample,
        isPublished: t.isPublished,
        attempts: t._count?.attempts ?? 0,
        submittedAttemptsCount: submittedAttempts.length,
        avgScore,
        questionsList:
          includeQuestions && (isAdmin || t.createdById === session?.user?.id)
            ? (t.sections || []).flatMap((s: any) => (s.questions || []).map(mapQuestion))
            : [],
      };
    });

    // Enforce student's active goals server-side
    const cookieStore = await cookies();
    const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null;
    const { goalIds: userGoalIds } = await getStudentGoals(session?.user?.id, cookieGoal);

    const queryGoal = searchParams.get("goal");
    const activeGoalIds = queryGoal && userGoalIds.length === 0
      ? parseGoalIds(queryGoal)
      : userGoalIds;

    let finalData = mapped;
    if (!includeAll && !seriesId && activeGoalIds.length > 0) {
      finalData = applyQuizGoalFilter(mapped, activeGoalIds);
    }

    return NextResponse.json(
      { success: true, data: finalData },
      {
        headers: {
          "Cache-Control": includeQuestions
            ? "private, no-store"
            : "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/exam/test/list]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
