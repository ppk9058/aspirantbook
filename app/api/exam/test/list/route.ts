import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const isAdmin = role === "ADMIN";
    const isTeacher = role === "TEACHER";

    const { searchParams } = new URL(req.url);
    const seriesId = searchParams.get("seriesId");
    const category = searchParams.get("category");
    // Only ADMIN or TEACHER can ever request includeQuestions; disallowed for students
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
          { createdById: session.user.id },
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
        totalQuestions: true,
        totalMarks: true,
        durationMinutes: true,
        accessMode: true,
        isPublished: true,
        createdById: true,
        _count: {
          select: { attempts: true },
        },
        series: {
          select: { title: true, category: true, slug: true, isFree: true, isPro: true },
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
      return {
        id: t.id,
        seriesId: t.seriesId,
        seriesSlug: t.series?.slug || t.seriesId,
        seriesTitle: t.series?.title || "Test Series",
        category: t.series?.category || "General Studies",
        title: t.title,
        titleHi: t.titleHi,
        testType: t.testType,
        questions: t.totalQuestions || qCount || 5,
        marks: t.totalMarks || qCount || 5,
        durationMinutes: t.durationMinutes || 10,
        languages: "English, Hindi",
        accessMode: t.accessMode,
        isFree: t.accessMode === "FREE",
        seriesIsPro: Boolean(t.series?.isPro),
        seriesIsFree: Boolean(t.series?.isFree),
        isFreeSample,
        isPublished: t.isPublished,
        attempts: t._count?.attempts ?? 0,
        questionsList:
          includeQuestions && (isAdmin || t.createdById === session.user.id)
            ? (t.sections || []).flatMap((s: any) => (s.questions || []).map(mapQuestion))
            : [],
      };
    });

    return NextResponse.json(
      { success: true, data: mapped },
      {
        headers: {
          "Cache-Control": includeQuestions
            ? "private, no-store"
            : "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/exam/test/list]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
