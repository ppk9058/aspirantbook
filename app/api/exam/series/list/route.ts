import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { getStudentGoals, parseGoalIds } from "@/lib/goals/student-goals";
import { applyTestSeriesGoalFilter } from "@/lib/goals/goal-filters";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const includeAll = searchParams.get("includeAll") === "true";

    // Enforce student's active goals from DB/session/cookie as authoritative source
    const session = await auth();
    const cookieStore = await cookies();
    const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null;
    const { goalIds: userGoalIds } = await getStudentGoals(session?.user?.id, cookieGoal);

    // Query string goal takes explicit priority over cookie/profile goals
    const queryGoal = searchParams.get("goal");
    const activeGoalIds = queryGoal
      ? parseGoalIds(queryGoal)
      : userGoalIds;

    const where: any = { isPublished: true };
    if (category && category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }
    const seriesList = await prisma.examSeries.findMany({
      where,
      include: {
        tests: {
          where: { isPublished: true },
          select: { accessMode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let formatted = seriesList.map((s) => {
      let highlights: string[] = Array.isArray(s.highlights) && s.highlights.length > 0 ? s.highlights : [];
      let cleanDescription = (s.description || "").trim();
      let logoType = s.logoType && s.logoType !== "general" ? s.logoType : null;

      // Safe legacy fallback: parse metadata if logoType/highlights columns are empty and description has JSON
      if (cleanDescription.startsWith("{") && cleanDescription.endsWith("}")) {
        try {
          const meta = JSON.parse(cleanDescription);
          if (!logoType && meta.logoType) {
            logoType = meta.logoType;
          }
          if (highlights.length === 0 && Array.isArray(meta.highlights)) {
            highlights = meta.highlights.filter((h: any) => typeof h === "string" && h.trim().length > 0);
          }
          cleanDescription = (meta.description || meta.overview || meta.subtitle || "").trim();
        } catch {
          cleanDescription = "";
        }
      }

      if (!logoType) {
        logoType = s.logoType || (s.slug.includes("upsc") ? "upsc" : s.slug.includes("bpsc") ? "bpsc" : "general");
      }

      const publishedTests = s.tests || [];
      const totalTestsCount = publishedTests.length;
      const freeTestsCount = publishedTests.filter((t: any) => t.accessMode === "FREE").length;
      const usersCount = s.usersCount;
      const usersStr = usersCount >= 1000 ? `${(usersCount / 1000).toFixed(1)}k` : `${usersCount}`;

      return {
        id: s.slug || s.id,
        slug: s.slug,
        title: s.title,
        category: s.category,
        examName: s.examName,
        examType: "Civil Services",
        logoType,
        users: usersStr,
        totalTests: totalTestsCount,
        freeTests: freeTestsCount,
        languages: s.languages,
        highlights,
        description: cleanDescription,
        bannerUrl: s.bannerUrl || null,
        syllabus: s.syllabus || null,
        keyFeatures: Array.isArray(s.keyFeatures) ? s.keyFeatures : [],
        whyThisSeries: s.whyThisSeries || null,
        goalId: s.category.toLowerCase().replace(/\s+/g, "-"),
        tags: [s.category.toLowerCase()],
        isFree: s.isFree ?? false,
        isPro: s.isPro ?? false,
      };
    });

    // Server-side strict multi-goal filtering
    if (!includeAll && activeGoalIds.length > 0 && (!category || category === "All")) {
      formatted = applyTestSeriesGoalFilter(formatted, activeGoalIds);
    }

    return NextResponse.json(
      { success: true, data: formatted },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to list ExamSeries:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
