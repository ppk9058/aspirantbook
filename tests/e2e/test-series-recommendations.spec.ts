import { test, expect } from "@playwright/test";
import { prisma, newNonce, createActor } from "./test-series-e2e-helpers";
import { UserRole } from "@prisma/client";

test.describe("Test Series Recommendations E2E", () => {
  const nonce = newNonce();
  let teacherId: string;
  let testSeriesSlug: string;
  let eligibleSeriesId: string;
  let currentSeriesId: string;
  let zeroSeriesId: string;

  test.beforeAll(async () => {
    const teacher = await createActor(nonce, UserRole.TEACHER, "rec-teacher");
    teacherId = teacher.id;

    // Create current series
    const current = await prisma.examSeries.create({
      data: {
        title: `E2E Main Series ${nonce}`,
        slug: `e2e-main-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        createdById: teacherId,
        tests: {
          create: {
            title: `E2E Test 1 ${nonce}`,
            isPublished: true,
            createdById: teacherId,
            accessMode: "FREE",
          },
        },
      },
    });
    currentSeriesId = current.id;
    testSeriesSlug = current.slug;

    // Create another eligible series with tests & high popularity so it is guaranteed in top 6
    const eligible = await prisma.examSeries.create({
      data: {
        title: `E2E Eligible Recommended Series ${nonce}`,
        slug: `e2e-rec-eligible-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        createdById: teacherId,
        tests: {
          createMany: {
            data: [
              { title: `E2E Rec Test 1 ${nonce}`, isPublished: true, createdById: teacherId, accessMode: "FREE" },
              { title: `E2E Rec Test 2 ${nonce}`, isPublished: true, createdById: teacherId, accessMode: "FREE" },
            ],
          },
        },
      },
    });
    eligibleSeriesId = eligible.id;

    // Create 10 enrollments using dummy user accounts to ensure top popularity
    const dummyUsers = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createActor(`${nonce}-${i}`, UserRole.FREE, `dummy-${i}`)
      )
    );
    await prisma.examSeriesEnrollment.createMany({
      data: dummyUsers.map((u) => ({
        userId: u.id,
        seriesId: eligible.id,
      })),
    });

    // Create a series with 0 published tests (negative control 1)
    const zero = await prisma.examSeries.create({
      data: {
        title: `E2E Zero Tests Series ${nonce}`,
        slug: `e2e-zero-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        createdById: teacherId,
      },
    });
    zeroSeriesId = zero.id;

    // Create an unpublished series (negative control 2)
    const unpublished = await prisma.examSeries.create({
      data: {
        title: `E2E Unpublished Series ${nonce}`,
        slug: `e2e-unpub-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: false,
        createdById: teacherId,
        tests: {
          create: {
            title: `E2E Unpub Test ${nonce}`,
            isPublished: true,
            createdById: teacherId,
            accessMode: "FREE",
          },
        },
      },
    });

    // Create an enrolled series for a student (negative control 3)
    const enrolled = await prisma.examSeries.create({
      data: {
        title: `E2E Enrolled Series ${nonce}`,
        slug: `e2e-enrolled-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        createdById: teacherId,
        tests: {
          create: {
            title: `E2E Enrolled Test ${nonce}`,
            isPublished: true,
            createdById: teacherId,
            accessMode: "FREE",
          },
        },
      },
    });

    const enrolledStudent = await createActor(nonce, UserRole.FREE, "rec-enrolled-student");
    await prisma.examSeriesEnrollment.create({
      data: {
        userId: enrolledStudent.id,
        seriesId: enrolled.id,
      },
    });

    // Goal mismatch series (negative control 4)
    const mismatch = await prisma.examSeries.create({
      data: {
        title: `E2E Mismatch Series ${nonce}`,
        slug: `e2e-mismatch-${nonce}`,
        category: "Banking",
        examName: "Banking",
        isPublished: true,
        createdById: teacherId,
        tests: {
          create: {
            title: `E2E Mismatch Test ${nonce}`,
            isPublished: true,
            createdById: teacherId,
            accessMode: "FREE",
          },
        },
      },
    });

    (global as any).recEnrolledStudentId = enrolledStudent.id;
    (global as any).recUnpublishedId = unpublished.id;
    (global as any).recEnrolledId = enrolled.id;
    (global as any).recMismatchId = mismatch.id;
  });

  test.afterAll(async () => {
    // Isolated teardown: clean ONLY rows created by this spec
    const allIds = [
      currentSeriesId,
      eligibleSeriesId,
      zeroSeriesId,
      (global as any).recUnpublishedId,
      (global as any).recEnrolledId,
      (global as any).recMismatchId,
    ].filter(Boolean);

    await prisma.examSeriesEnrollment.deleteMany({
      where: { seriesId: { in: allIds } },
    });
    await prisma.examTest.deleteMany({
      where: { seriesId: { in: allIds } },
    });
    await prisma.examSeries.deleteMany({
      where: { id: { in: allIds } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: nonce.toLowerCase() } },
    });
  });

  test("guest visits series detail and sees real recommendations without drafts, 0-test, or negative controls", async ({
    page,
    request,
  }) => {
    await page.goto(`/test-series/${testSeriesSlug}`);
    await expect(page.locator("text=Loading Test Series...")).not.toBeVisible({ timeout: 15000 });

    // "More Testseries for you" section should be visible
    const recSection = page.locator("text=More Testseries for you");
    await expect(recSection).toBeVisible({ timeout: 25000 });

    // Eligible series must be visible
    await expect(page.locator(`text=E2E Eligible Recommended Series ${nonce}`)).toBeVisible();

    // Current series itself must NOT be in the recommendations (negative control: current series)
    const recSidebar = page.locator(".lg\\:col-span-4");
    await expect(recSidebar.locator(`text=E2E Main Series ${nonce}`)).toHaveCount(0);

    // Series with 0 published tests must NOT be in recommendations (negative control: 0 published tests)
    await expect(recSidebar.locator(`text=E2E Zero Tests Series ${nonce}`)).toHaveCount(0);

    // Unpublished series must NOT be in recommendations (negative control: unpublished)
    await expect(recSidebar.locator(`text=E2E Unpublished Series ${nonce}`)).toHaveCount(0);

    // API check with logged-in enrolled student and active BPSC goal:
    const enrolledStudentId = (global as any).recEnrolledStudentId;
    const apiRes = await request.get(
      `/api/exam/series/recommendations?seriesId=${currentSeriesId}&userId=${enrolledStudentId}&goal=bpsc`
    );
    expect(apiRes.status()).toBe(200);
    const body = await apiRes.json();
    expect(body.success).toBe(true);
    const recs: any[] = body.data;

    // Negative control assertions via recommendations engine:
    // 1. Current series excluded
    expect(recs.some((r) => r.title === `E2E Main Series ${nonce}`)).toBe(false);
    // 2. 0-test series excluded
    expect(recs.some((r) => r.title === `E2E Zero Tests Series ${nonce}`)).toBe(false);
    // 3. Unpublished series excluded
    expect(recs.some((r) => r.title === `E2E Unpublished Series ${nonce}`)).toBe(false);
    // 4. Enrolled series excluded for the student
    expect(recs.some((r) => r.title === `E2E Enrolled Series ${nonce}`)).toBe(false);
    // 5. Eligible series present
    expect(recs.some((r) => r.title === `E2E Eligible Recommended Series ${nonce}`)).toBe(true);
  });
});
