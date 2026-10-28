import { test, expect } from "@playwright/test";

import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers";

/**
 * B12: the web dashboard used to invent its numbers:
 *  - guests were shown XP 150, a 3-day streak and 2 achievements;
 *  - "hours learned" was a fixed 8;
 *  - every course card fell back to a 4.8 rating, 1000 learners, "40 hours" and
 *    20 lessons;
 *  - the Tests tab listed two hand-written mock tests per goal, regardless of
 *    what was actually published.
 *
 * This spec signs in a learner with a real enrolled course, a completed lesson
 * and a published current-affairs test, then asserts the dashboard shows those
 * real rows and none of the old fixture titles.
 */

test.describe("dashboard shows real learner data", () => {
  let userId = "";
  let courseId = "";
  let seriesId = "";

  test.afterAll(async () => {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    if (seriesId) await prisma.examSeries.deleteMany({ where: { id: seriesId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  test("renders the learner's course, progress and published tests", async ({ page }, testInfo) => {
    // The tabbed "My Learning Hub" (and therefore the Tests tab) renders at
    // >= 1024px; the phone layout uses the native-style dashboard sections.
    test.skip(testInfo.project.name !== "desktop", "tabbed dashboard hub is desktop/tablet only");
    test.setTimeout(180_000);
    await prisma.$connect();

    const nonce = newNonce();
    const student = await createActor(nonce, "FREE", "dashboard");
    userId = student.id;

    // A 5-day streak so the old hardcoded 1/3 is visibly wrong.
    await prisma.user.update({ where: { id: userId }, data: { streak: 5 } });

    const course = await prisma.course.create({
      data: {
        title: `${nonce} Real Dashboard Course`,
        slug: `${nonce}-real-dashboard-course`.toLowerCase(),
        description: "Course created by the dashboard regression test.",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        rating: 4.2,
      },
      select: { id: true },
    });
    courseId = course.id;

    const chapter = await prisma.chapter.create({
      data: { title: `${nonce} Chapter`, order: 1, courseId },
      select: { id: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        title: `${nonce} Lesson`,
        type: "READING",
        order: 1,
        duration: 25,
        chapterId: chapter.id,
      },
      select: { id: true },
    });

    await prisma.enrollment.create({ data: { userId, courseId } });
    await prisma.progress.create({
      data: {
        userId,
        lessonId: lesson.id,
        completed: true,
        timeSpent: 1800,
        lastAccessed: new Date(),
      },
    });

    const series = await prisma.examSeries.create({
      data: {
        title: `${nonce} Series`,
        slug: `${nonce}-series`.toLowerCase(),
        examName: "BPSC",
        category: "Civil Services",
        isPublished: true,
        createdById: userId,
      },
      select: { id: true },
    });
    seriesId = series.id;

    await prisma.examTest.create({
      data: {
        seriesId,
        title: `${nonce} Published CA Test`,
        testType: "CURRENT_AFFAIRS",
        isPublished: true,
        year: 2026,
        month: 10,
        totalQuestions: 8,
        durationMinutes: 15,
        createdById: userId,
      },
    });

    await loginThroughUi(page, student.email);

    const response = await page.goto("/dashboard");
    expect(response?.status()).toBe(200);

    // The page rendered the dashboard rather than the "unavailable" fallback.
    await expect(page.getByText("Dashboard temporarily unavailable")).toHaveCount(0);
    await expect(
      page.getByText(/Displaying batches, lectures, and mock tests customized for/)
    ).toBeVisible();

    // The real enrolled course and its real completion are shown.
    await expect(page.getByRole("button", { name: /Enrolled Courses \(1\)/ })).toBeVisible();
    await expect(page.getByText(`${nonce} Real Dashboard Course`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("100% Completed").first()).toBeVisible();

    // The tests tab lists the published test, not a hand-written fixture.
    await page.getByRole("button", { name: /Tests & CBT/ }).click();
    await expect(page.getByText(`${nonce} Published CA Test`, { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    for (const fakeTitle of [
      "72nd BPSC CCE Full Length Prelims Mock 01",
      "Bihar Special History & Contemporary GK Drill",
      "UPSC Prelims GS Paper 1 All India Rank Mock 01",
      "Blind 75 & NeetCode 150 All India Coding Sprint",
      "SSC CGL 2026 Tier 1 All India Live Mock",
    ]) {
      await expect(page.getByText(fakeTitle, { exact: true })).toHaveCount(0);
    }
  });
});
