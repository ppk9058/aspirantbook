import { prisma } from "@/lib/prisma";
import { DashboardSummaryDto } from "@aspirantbook/shared";

/**
 * The daily goal is a client-side preference (localStorage `ts_daily_goal_minutes`,
 * default 30) that the server cannot read. Progress is therefore measured against
 * the documented default rather than an invented per-user number.
 */
export const DEFAULT_DAILY_GOAL_MINUTES = 30;

function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

async function loadFeaturedTests(): Promise<
  DashboardSummaryDto["upcomingOrRecentTests"]
> {
  const featuredTests = await prisma.examTest.findMany({
    where: { isPublished: true, isArchived: false },
    take: 3,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      series: { select: { title: true } },
    },
  });

  return featuredTests.map((t) => ({
    id: t.id,
    title: t.title,
    seriesTitle: t.series?.title || "Featured Test",
    durationMinutes: t.durationMinutes,
    status: "NOT_STARTED",
  }));
}

/**
 * Today's speed quiz, taken from the real published CURRENT_AFFAIRS tests. There
 * is no separate daily-quiz row, so this returns null when no such test is
 * published instead of pointing the app at a quiz id that does not exist.
 */
async function loadTodayQuiz(): Promise<DashboardSummaryDto["todayQuiz"]> {
  const quiz = await prisma.examTest.findFirst({
    where: {
      testType: "CURRENT_AFFAIRS",
      isPublished: true,
      isArchived: false,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, totalQuestions: true },
  });

  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    questionCount: quiz.totalQuestions,
  };
}

/**
 * B12: every value in this summary used to be invented — a streak of 1 or 3
 * depending on whether the user had attempted a test, a goal progress of 65/20,
 * a quiz id ("daily-ca-quiz-today") that no row matches, and a "continue
 * learning" lesson taken from the first published course rather than the
 * learner's own progress.
 *
 * Everything is now read from the learner's rows: streak from `User.streak`,
 * today's progress from the lessons they actually opened today, continue-learning
 * from their most recent progress record, and the quiz from a published
 * CURRENT_AFFAIRS test. A guest gets zeros, and a missing quiz is `null`.
 */
export async function getDashboardSummary(
  userId?: string | null
): Promise<DashboardSummaryDto> {
  let continueLearning: DashboardSummaryDto["continueLearning"] = null;
  let recentTests: DashboardSummaryDto["upcomingOrRecentTests"] = [];
  let streakDays = 0;
  let dailyGoalProgress = 0;

  if (userId) {
    const today = startOfUtcDay();

    const [user, attempts, latestProgress, todayProgress] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true },
      }),

      prisma.examAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
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
      }),

      // The lesson the learner touched most recently, in a course that is still
      // published so the resume link cannot 404.
      prisma.progress.findFirst({
        where: {
          userId,
          lesson: { chapter: { course: { isPublished: true } } },
        },
        orderBy: { lastAccessed: "desc" },
        select: {
          lesson: {
            select: {
              id: true,
              title: true,
              chapter: {
                select: {
                  course: { select: { title: true, slug: true } },
                },
              },
            },
          },
        },
      }),

      // Watch/read time recorded on lessons opened today. `Progress.timeSpent`
      // is in seconds (the players post seconds).
      prisma.progress.aggregate({
        where: { userId, lastAccessed: { gte: today } },
        _sum: { timeSpent: true },
      }),
    ]);

    streakDays = user?.streak ?? 0;

    const secondsToday = todayProgress._sum.timeSpent ?? 0;
    const minutesToday = Math.floor(secondsToday / 60);
    dailyGoalProgress = Math.min(
      100,
      Math.round((minutesToday / DEFAULT_DAILY_GOAL_MINUTES) * 100)
    );

    recentTests = attempts.map((a) => ({
      id: a.test.id,
      title: a.test.title,
      seriesTitle: a.test.series?.title || "Test Series",
      durationMinutes: a.test.durationMinutes,
      score: a.score,
      status: a.status,
    }));

    const course = latestProgress?.lesson.chapter.course;
    if (latestProgress && course) {
      continueLearning = {
        lessonId: latestProgress.lesson.id,
        lessonTitle: latestProgress.lesson.title,
        tutorialTitle: course.title,
        tutorialSlug: course.slug,
      };
    }
  }

  const [featuredTests, todayQuiz] = await Promise.all([
    recentTests.length === 0 ? loadFeaturedTests() : Promise.resolve([]),
    loadTodayQuiz(),
  ]);

  if (recentTests.length === 0) {
    recentTests = featuredTests;
  }

  return {
    streakDays,
    dailyGoalProgress,
    continueLearning,
    upcomingOrRecentTests: recentTests,
    todayQuiz,
  };
}
