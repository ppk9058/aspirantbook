import { prisma } from "@/lib/prisma";
import { getStudentGoals } from "@/lib/goals/student-goals";
import { applyTestSeriesGoalFilter } from "@/lib/goals/goal-filters";

export interface RecommendedSeriesOptions {
  currentSeriesId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  cookieGoal?: string | null;
  limit?: number;
}

export interface RecommendedSeriesCard {
  id: string;
  slug: string;
  title: string;
  category: string;
  examName: string;
  examType: string;
  logoType: string | null;
  users: string;
  totalTests: number;
  freeTests: number;
  languages: string;
  highlights: string[];
  description: string;
  goalId: string;
  tags: string[];
  isFree: boolean;
  isPro: boolean;
  href: string;
}

export async function getRecommendedTestSeries(
  options: RecommendedSeriesOptions = {}
): Promise<RecommendedSeriesCard[]> {
  const {
    currentSeriesId,
    userId,
    userRole,
    cookieGoal,
    limit = 6,
  } = options;

  // 1. Resolve student active goals (DB -> cookie)
  const { goalIds } = await getStudentGoals(userId, cookieGoal);

  // 2. Determine excluded series for logged-in students
  const userExcludedSeriesIds = new Set<string>();

  // Only exclude enrolled & attempted series for students (not teachers/admins previewing)
  const isStudent = !userRole || (userRole !== "ADMIN" && userRole !== "TEACHER");
  if (userId && isStudent) {
    const [userEnrollments, userAttempts] = await Promise.all([
      prisma.examSeriesEnrollment.findMany({
        where: { userId },
        select: { seriesId: true },
      }),
      prisma.examAttempt.findMany({
        where: { userId },
        select: {
          test: {
            select: { seriesId: true },
          },
        },
      }),
    ]);

    for (const e of userEnrollments) {
      if (e.seriesId) userExcludedSeriesIds.add(e.seriesId);
    }
    for (const a of userAttempts) {
      if (a.test?.seriesId) userExcludedSeriesIds.add(a.test.seriesId);
    }
  }

  // 3. Query eligible series:
  // - isPublished = true
  // - At least 1 published test
  // - NOT the current series
  // - Include _count.enrollments for exact popularity
  const where: any = {
    isPublished: true,
    tests: {
      some: {
        isPublished: true,
      },
    },
  };

  if (currentSeriesId) {
    where.AND = [
      { id: { not: currentSeriesId } },
      { slug: { not: currentSeriesId } },
    ];
  }

  const seriesList = await prisma.examSeries.findMany({
    where,
    include: {
      tests: {
        where: { isPublished: true },
        select: { accessMode: true },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Filter out excluded series (enrolled / attempted)
  const eligibleSeries = seriesList.filter((s) => {
    if (userExcludedSeriesIds.has(s.id) || userExcludedSeriesIds.has(s.slug)) {
      return false;
    }
    return true;
  });

  if (eligibleSeries.length === 0) {
    return [];
  }

  // 5. Format cards using canonical series list API format + href
  type FormattedWithMeta = RecommendedSeriesCard & {
    enrollmentCount: number;
    createdAt: Date;
  };

  const formatted: FormattedWithMeta[] = eligibleSeries.map((s) => {
    let highlights: string[] =
      Array.isArray(s.highlights) && s.highlights.length > 0 ? s.highlights : [];
    let cleanDescription = (s.description || "").trim();
    let logoType = s.logoType && s.logoType !== "general" ? s.logoType : null;

    if (cleanDescription.startsWith("{") && cleanDescription.endsWith("}")) {
      try {
        const meta = JSON.parse(cleanDescription);
        if (!logoType && meta.logoType) {
          logoType = meta.logoType;
        }
        if (highlights.length === 0 && Array.isArray(meta.highlights)) {
          highlights = meta.highlights.filter(
            (h: any) => typeof h === "string" && h.trim().length > 0
          );
        }
        cleanDescription = (meta.description || meta.overview || meta.subtitle || "").trim();
      } catch {
        cleanDescription = "";
      }
    }

    if (!logoType) {
      logoType =
        s.logoType ||
        (s.slug.includes("upsc") ? "upsc" : s.slug.includes("bpsc") ? "bpsc" : "general");
    }

    const publishedTests = s.tests || [];
    const totalTestsCount = publishedTests.length;
    const freeTestsCount = publishedTests.filter((t) => t.accessMode === "FREE").length;
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
      goalId: s.category.toLowerCase().replace(/\s+/g, "-"),
      tags: [s.category.toLowerCase()],
      isFree: s.isFree ?? false,
      isPro: s.isPro ?? false,
      href: `/test-series/${s.slug || s.id}`,
      enrollmentCount: s._count.enrollments,
      createdAt: s.createdAt,
    };
  });

  // 6. Ranking Order:
  // (a) Same goal/category first (using lib/goals applyTestSeriesGoalFilter)
  // (b) Popularity: Number of ExamSeriesEnrollment rows DESC (s._count.enrollments)
  // (c) Published test count DESC
  // (d) Newest DESC (createdAt)
  // (e) Deterministic tie-breaker (id)
  const matchesGoal = (card: RecommendedSeriesCard) => {
    if (!goalIds || goalIds.length === 0) return false;
    const match = applyTestSeriesGoalFilter([card], goalIds);
    return match.length > 0;
  };

  formatted.sort((a, b) => {
    // 1. Goal match first
    const aGoal = matchesGoal(a) ? 1 : 0;
    const bGoal = matchesGoal(b) ? 1 : 0;
    if (aGoal !== bGoal) return bGoal - aGoal;

    // 2. Popularity: ExamSeriesEnrollment count DESC
    if (b.enrollmentCount !== a.enrollmentCount) {
      return b.enrollmentCount - a.enrollmentCount;
    }

    // 3. Published test count DESC
    if (b.totalTests !== a.totalTests) {
      return b.totalTests - a.totalTests;
    }

    // 4. Newest DESC
    if (b.createdAt.getTime() !== a.createdAt.getTime()) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }

    // 5. Deterministic tie-breaker
    return a.id.localeCompare(b.id);
  });

  const maxItems = Math.min(Math.max(limit, 1), 6);
  const sliced = formatted.slice(0, maxItems);

  // 7. Strip internal sorting fields so only canonical card fields + href are returned
  return sliced.map(
    ({
      id,
      slug,
      title,
      category,
      examName,
      examType,
      logoType,
      users,
      totalTests,
      freeTests,
      languages,
      highlights,
      description,
      goalId,
      tags,
      isFree,
      isPro,
      href,
    }) => ({
      id,
      slug,
      title,
      category,
      examName,
      examType,
      logoType,
      users,
      totalTests,
      freeTests,
      languages,
      highlights,
      description,
      goalId,
      tags,
      isFree,
      isPro,
      href,
    })
  );
}
