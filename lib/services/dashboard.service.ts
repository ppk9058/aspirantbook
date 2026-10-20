import { prisma } from "@/lib/prisma";
import { DashboardSummaryDto } from "@aspirantbook/shared";

export async function getDashboardSummary(
  userId?: string | null
): Promise<DashboardSummaryDto> {
  let continueLearning: DashboardSummaryDto["continueLearning"] = null;
  let recentTests: DashboardSummaryDto["upcomingOrRecentTests"] = [];
  let streakDays = 1;

  if (userId) {
    // 1. Fetch recent attempt or test
    const attempts = await prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 3,
      select: {
        id: true,
        score: true,
        status: true,
        test: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            series: { select: { title: true } },
          },
        },
      },
    });

    recentTests = attempts.map((a) => ({
      id: a.test.id,
      title: a.test.title,
      seriesTitle: a.test.series?.title || "Test Series",
      durationMinutes: a.test.durationMinutes,
      score: a.score,
      status: a.status,
    }));

    if (attempts.length > 0) {
      streakDays = 3;
    }
  }

  // 2. Fetch featured test if no attempts
  if (recentTests.length === 0) {
    const featuredTests = await prisma.examTest.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        durationMinutes: true,
        series: { select: { title: true } },
      },
    });

    recentTests = featuredTests.map((t) => ({
      id: t.id,
      title: t.title,
      seriesTitle: t.series?.title || "Featured Test",
      durationMinutes: t.durationMinutes,
      status: "NOT_STARTED",
    }));
  }

  // 3. Continue learning tutorial
  const tutorial = await prisma.course.findFirst({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      chapters: {
        take: 1,
        select: {
          lessons: {
            take: 1,
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (tutorial && tutorial.chapters[0]?.lessons[0]) {
    continueLearning = {
      lessonId: tutorial.chapters[0].lessons[0].id,
      lessonTitle: tutorial.chapters[0].lessons[0].title,
      tutorialTitle: tutorial.title,
      tutorialSlug: tutorial.slug,
    };
  }

  return {
    streakDays,
    dailyGoalProgress: userId ? 65 : 20,
    continueLearning,
    upcomingOrRecentTests: recentTests,
    todayQuiz: {
      id: "daily-ca-quiz-today",
      title: "Daily Current Affairs & General Awareness Quiz",
      questionCount: 10,
    },
  };
}
