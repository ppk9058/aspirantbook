import { test, expect } from "@playwright/test";

import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers";

/**
 * Phase D: /tracks/[slug] advertised a hardcoded "~20 Hours" and a "Certificate",
 * and `LearningPath` hardcoded `isCompleted = false` (with a TODO) while the page
 * passed no progress at all. So every step after the first was locked forever and
 * a finished course never showed as complete.
 *
 * The fixture below builds a two-course track and marks the first course's only
 * lesson complete, then asserts the page reports real numbers and unlocks step 2.
 */

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "phone", width: 390, height: 844 },
] as const;

test.describe("Phase D track path uses real progress", () => {
  let userId = "";
  let trackId = "";

  test.afterAll(async () => {
    if (trackId) {
      const links = await prisma.trackCourse.findMany({
        where: { trackId },
        select: { courseId: true },
      });
      const courseIds = links.map((l) => l.courseId);
      await prisma.progress.deleteMany({ where: { userId } });
      await prisma.enrollment.deleteMany({ where: { userId } });
      await prisma.trackCourse.deleteMany({ where: { trackId } });
      await prisma.track.deleteMany({ where: { id: trackId } });
      for (const courseId of courseIds) {
        await prisma.lesson.deleteMany({ where: { chapter: { courseId } } });
        await prisma.chapter.deleteMany({ where: { courseId } });
        await prisma.course.deleteMany({ where: { id: courseId } });
      }
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  test("counts lessons from the outline and unlocks a completed step", async ({ page }) => {
    test.setTimeout(240_000);
    await prisma.$connect();

    const nonce = newNonce();
    const student = await createActor(nonce, "FREE", "track-progress");
    userId = student.id;

    const track = await prisma.track.create({
      data: {
        slug: `${nonce}-phase-d-track`,
        title: `${nonce} Phase D Track`,
        description: "Track fixture for the real-progress check",
        type: "SKILL",
        isPublished: true,
      },
      select: { id: true, slug: true },
    });
    trackId = track.id;

    const courseA = await prisma.course.create({
      data: {
        title: `${nonce} Course A`,
        slug: `${nonce}-course-a`,
        description: "First step",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    const courseB = await prisma.course.create({
      data: {
        title: `${nonce} Course B`,
        slug: `${nonce}-course-b`,
        description: "Second step",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
      },
      select: { id: true },
    });

    await prisma.trackCourse.createMany({
      data: [
        { trackId, courseId: courseA.id, order: 1, isRequired: true },
        { trackId, courseId: courseB.id, order: 2, isRequired: true },
      ],
    });

    const chapterA = await prisma.chapter.create({
      data: { title: `${nonce} A1`, order: 1, courseId: courseA.id },
      select: { id: true },
    });
    const lessonA = await prisma.lesson.create({
      data: { title: `${nonce} A1 Lesson`, order: 1, type: "READING", chapterId: chapterA.id },
      select: { id: true },
    });
    const chapterB = await prisma.chapter.create({
      data: { title: `${nonce} B1`, order: 1, courseId: courseB.id },
      select: { id: true },
    });
    await prisma.lesson.create({
      data: { title: `${nonce} B1 Lesson`, order: 1, type: "READING", chapterId: chapterB.id },
    });

    // Course A is finished; course B has not been started.
    await prisma.progress.create({
      data: {
        userId,
        lessonId: lessonA.id,
        completed: true,
        lastAccessed: new Date(),
      },
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginThroughUi(page, student.email);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/tracks/${track.slug}`);

      await expect(
        page.getByTestId("track-lesson-count"),
        `${viewport.label}: lesson count comes from the outline`
      ).toContainText("2 Lessons");

      await expect(
        page.getByTestId("track-completion"),
        `${viewport.label}: completion comes from the learner's progress`
      ).toContainText("1 of 2 completed");

      // The completed first course offers Review, and the next step is unlocked
      // because step 1 is complete.
      await expect(
        page.getByRole("link", { name: "Review Course" }),
        `${viewport.label}: a completed course reads as completed`
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Start Course" }),
        `${viewport.label}: the next step must unlock`
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Locked/ }),
        `${viewport.label}: nothing is locked once step 1 is complete`
      ).toHaveCount(0);

      // The invented metrics are gone.
      await expect(page.getByText("~20 Hours")).toHaveCount(0);
      await expect(page.getByText("Certificate", { exact: true })).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${viewport.label}: no horizontal scroll`).toBeLessThanOrEqual(1);
    }
  });
});
