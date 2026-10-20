import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getStudentGoals, parseGoalIds } from "@/lib/goals/student-goals";
import { applyQuizGoalFilter } from "@/lib/goals/goal-filters";
import { resolveAccess } from "@/lib/authwall/resolveAccess";
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const archivedParam = searchParams.get("archived");

    if (isAdmin) {
      // Admin sees both published and drafts
      if (archivedParam === "true" || archivedParam === "1") {
        conditions.push({ isArchived: true });
      } else if (archivedParam !== "all") {
        conditions.push({ isArchived: false });
      }
    } else if (isTeacher) {
      // Teacher sees published + tests they created
      conditions.push({
        OR: [
          { isPublished: true },
          { createdById: session?.user?.id ?? "" },
        ],
      });
      if (archivedParam === "true" || archivedParam === "1") {
        conditions.push({ isArchived: true });
      } else if (archivedParam !== "all") {
        conditions.push({ isArchived: false });
      }
    } else {
      // Students/free users see published and non-archived only
      conditions.push({ isPublished: true, isArchived: false });
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
        syllabus: true,
        syllabusHi: true,
        accessMode: true,
        gateMode: true,
        previewPercentage: true,
        isPublished: true,
        isArchived: true,
        archivedAt: true,
        isLive: true,
        liveStartAt: true,
        liveEndAt: true,
        order: true,
        createdById: true,
        createdAt: true,
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
          select: {
            title: true,
            category: true,
            slug: true,
            isFree: true,
            isPro: true,
            languages: true,
            isGated: true,
            previewPercentage: true,
            seoMode: true,
            gateTitle: true,
            gateSubtitle: true,
          },
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

    const isBot = await isVerifiedSearchEngineCrawler(req.headers);

    const mapped = tests.map((t: any) => {
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

      const access = resolveAccess({
        viewer: {
          userId: session?.user?.id || null,
          role,
          isVerifiedBot: isBot,
        },
        content: t.sections || [],
        containerGate: t.series,
        itemGate: {
          gateMode: t.gateMode,
          previewPercentage: t.previewPercentage,
        },
        isOwner: Boolean(session?.user?.id && t.createdById === session.user.id),
      });

      const isLockedForGuest = access.isLockedForGuest;
      const isFreeEffective = !isLockedForGuest && (t.accessMode === "FREE" || access.gateMode === "free");

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
        syllabus: t.syllabus,
        syllabusHi: t.syllabusHi,
        languages: t.series?.languages,
        accessMode: t.accessMode,
        isFree: isFreeEffective,
        isLockedForGuest,
        gateMode: access.gateMode,
        effectivePercentage: access.effectivePercentage,
        seriesIsPro: Boolean(t.series?.isPro),
        seriesIsFree: Boolean(t.series?.isFree),
        seriesIsGated: Boolean(t.series?.isGated),
        isFreeSample,
        isPublished: t.isPublished,
        isArchived: Boolean(t.isArchived),
        archivedAt: t.archivedAt ? t.archivedAt.toISOString() : null,
        isLive: Boolean(t.isLive),
        liveStartAt: t.liveStartAt ? t.liveStartAt.toISOString() : null,
        liveEndAt: t.liveEndAt ? t.liveEndAt.toISOString() : null,
        createdById: t.createdById,
        order: t.order ?? 0,
        createdAt: t.createdAt ? t.createdAt.toISOString() : null,
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
