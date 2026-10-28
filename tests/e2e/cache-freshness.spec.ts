import { test, expect } from "@playwright/test";

import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers";

/**
 * B10 (follow-up): a behavioural freshness proof, not a source contract.
 *
 * `GET /api/courses/video-courses` is served from `getPublishedVideoCourses`,
 * an `unstable_cache` entry tagged "courses" with a 60s TTL. The course studio
 * writes chapters and lessons through `/api/admin/courses/:id/{chapters,lessons}`,
 * and those handlers used to change the rows and return without dropping the
 * tag — so the catalog (lesson counts, membership) stayed stale for up to a
 * minute after an admin edited the course.
 *
 * The test warms the cache, mutates through the real studio routes, and reads
 * the catalog again immediately. Without the invalidation the second read still
 * reports the old counts.
 */

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3045";

interface VideoCourseRow {
  id: string;
  title: string;
  totalLessons: number;
  videoLessonCount: number;
}

async function fetchCatalog(page: import("@playwright/test").Page): Promise<VideoCourseRow[]> {
  const res = await page.request.get(`${BASE_URL}/api/courses/video-courses`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.courses as VideoCourseRow[];
}

test.describe("B10 cached course content refreshes after a studio mutation", () => {
  let adminId = "";
  let courseId = "";
  let chapterId = "";

  test.afterAll(async () => {
    if (courseId) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId } } });
      await prisma.chapter.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await prisma.$disconnect();
  });

  test("chapter and lesson writes drop the courses tag immediately", async ({ page }, testInfo) => {
    // Same API from every viewport; run it once.
    test.skip(testInfo.project.name !== "desktop", "API-level cache check");
    test.setTimeout(180_000);
    await prisma.$connect();

    const nonce = newNonce();
    const admin = await createActor(nonce, "ADMIN", "cache-admin");
    adminId = admin.id;

    const course = await prisma.course.create({
      data: {
        title: `${nonce} Cached Video Course`,
        slug: `${nonce}-cached-video-course`.toLowerCase(),
        description: "B10 freshness fixture",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        createdById: adminId,
      },
      select: { id: true },
    });
    courseId = course.id;

    const chapter = await prisma.chapter.create({
      data: { title: `${nonce} Chapter`, order: 1, courseId },
      select: { id: true },
    });
    chapterId = chapter.id;

    await prisma.lesson.create({
      data: {
        title: `${nonce} Lesson One`,
        type: "VIDEO",
        order: 1,
        videoUrl: "https://example.test/lesson-one.mp4",
        chapterId,
      },
    });

    await loginThroughUi(page, admin.email);

    const headers = { Origin: BASE_URL, "Content-Type": "application/json" };

    // ── prime the cached catalog through the already-invalidating course
    //    route, so the warm read is guaranteed to contain this fixture ───────
    const primeRes = await page.request.put(`${BASE_URL}/api/admin/courses/${courseId}`, {
      headers,
      data: { title: `${nonce} Cached Video Course` },
    });
    expect(primeRes.status(), await primeRes.text()).toBe(200);

    const warm = await fetchCatalog(page);
    const warmed = warm.find((c) => c.id === courseId);
    expect(warmed, "the fixture course must be listed by the video catalog").toBeTruthy();
    expect(warmed!.totalLessons).toBe(1);
    expect(warmed!.videoLessonCount).toBe(1);

    // ── add a video lesson through the studio route ────────────────────────
    const createRes = await page.request.post(
      `${BASE_URL}/api/admin/courses/${courseId}/lessons`,
      {
        headers,
        data: {
          chapterId,
          title: `${nonce} Lesson Two`,
          type: "VIDEO",
          videoUrl: "https://example.test/lesson-two.mp4",
        },
      }
    );
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = await createRes.json();

    const afterCreate = await fetchCatalog(page);
    const createdRow = afterCreate.find((c) => c.id === courseId);
    expect(
      createdRow?.totalLessons,
      "the cached catalog must show the newly added lesson without waiting for the 60s TTL"
    ).toBe(2);
    expect(createdRow?.videoLessonCount).toBe(2);

    // ── delete that lesson again through the studio route ──────────────────
    const deleteRes = await page.request.delete(
      `${BASE_URL}/api/admin/courses/${courseId}/lessons?lessonId=${created.id}`,
      { headers }
    );
    expect(deleteRes.status(), await deleteRes.text()).toBe(200);

    const afterDelete = await fetchCatalog(page);
    const deletedRow = afterDelete.find((c) => c.id === courseId);
    expect(
      deletedRow?.totalLessons,
      "the cached catalog must drop the deleted lesson immediately"
    ).toBe(1);

    // ── delete the chapter: the course has no videos left, so it must leave ─
    const chapterRes = await page.request.delete(
      `${BASE_URL}/api/admin/courses/${courseId}/chapters?chapterId=${chapterId}`,
      { headers }
    );
    expect(chapterRes.status(), await chapterRes.text()).toBe(200);

    const afterChapter = await fetchCatalog(page);
    expect(
      afterChapter.some((c) => c.id === courseId),
      "a course with no video lessons left must not stay in the cached catalog"
    ).toBe(false);

    // ── restoring a video lesson must be visible immediately too ────────────
    const restoredChapter = await prisma.chapter.create({
      data: { title: `${nonce} Chapter Restored`, order: 1, courseId },
      select: { id: true },
    });
    const restoreRes = await page.request.post(
      `${BASE_URL}/api/admin/courses/${courseId}/lessons`,
      {
        headers,
        data: {
          chapterId: restoredChapter.id,
          title: `${nonce} Lesson Restored`,
          type: "VIDEO",
          videoUrl: "https://example.test/lesson-restored.mp4",
        },
      }
    );
    expect(restoreRes.status(), await restoreRes.text()).toBe(201);

    const afterRestore = await fetchCatalog(page);
    const restored = afterRestore.find((c) => c.id === courseId);
    expect(restored?.totalLessons, "a re-added video lesson must appear at once").toBe(1);

    // ── a title edit must also be visible immediately (control) ─────────────
    const renameRes = await page.request.put(`${BASE_URL}/api/admin/courses/${courseId}`, {
      headers,
      data: { title: `${nonce} Renamed Video Course` },
    });
    expect(renameRes.status(), await renameRes.text()).toBe(200);

    const afterRename = await fetchCatalog(page);
    const renamed = afterRename.find((c) => c.id === courseId);
    expect(renamed?.title).toBe(`${nonce} Renamed Video Course`);
  });
});
