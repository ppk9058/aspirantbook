import { test, expect } from "@playwright/test";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  questionFixture,
  saveArtifacts,
  seedSeriesWithTest,
  slugFor,
} from "./test-series-e2e-helpers";
import { formatIstDateTime } from "../../lib/format-date";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

test.describe("Publish draft test from Review, Edit, and Test List", () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("1. Draft with all questions complete: Publish from REVIEW page -> PUBLISHED, student can see, totalTests +1, question ids unchanged", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-reviewer");
    const student = await createActor(nonce, "FREE", "student-reader");

    try {
      // 1. Seed series with draft test (5 complete questions)
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 5,
      });
      await prisma.examTest.update({ where: { id: testRow.id }, data: { isPublished: false } });
      await prisma.examSeries.update({ where: { id: series.id }, data: { totalTests: 0 } });

      // Verify initial totalTests is 0
      const initialSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(initialSeries.totalTests).toBe(0);

      const originalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(originalQuestions).toHaveLength(5);
      const originalQIds = originalQuestions.map((q) => q.id);

      // Student cannot access draft test via student route
      await loginThroughUi(page, student.email);
      const studentResBefore = await page.request.get(`${BASE}/test-series/${series.slug}?testId=${testRow.id}`);
      expect(studentResBefore.status()).toBe(404);

      // Login as teacher and visit review page
      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/review`);

      // Review page loads, shows "5 of 5 complete"
      await expect(page.getByText("5 of 5 complete")).toBeVisible({ timeout: 30_000 });

      // Publish button is present and enabled (desktop header or mobile bottom bar)
      const isMobile = (testInfo.project.name || "").includes("mobile");
      const publishBtn = isMobile
        ? page.getByTestId("mobile-review-publish-button")
        : page.getByTestId("publish-top-bar-button");
      await expect(publishBtn).toBeVisible();
      await expect(publishBtn).toBeEnabled();

      // Click Publish -> dialog opens
      await publishBtn.click();
      const confirmDialog = page.getByTestId("publish-confirm-dialog");
      await expect(confirmDialog).toBeVisible();
      await expect(page.getByText("Publish this test? Students will be able to attempt it.")).toBeVisible();

      // Click Publish in dialog
      await page.getByTestId("confirm-publish-button").click();

      // Modal closes, success banner appears
      await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
      const publishedBadge = isMobile
        ? page.getByTestId("mobile-published-badge")
        : page.getByTestId("desktop-published-badge");
      await expect(publishedBadge).toBeVisible();

      // Verify in DB
      const updatedTest = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(updatedTest.isPublished).toBe(true);

      const updatedSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(updatedSeries.totalTests).toBe(1);

      const afterQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(afterQuestions.map((q) => q.id)).toEqual(originalQIds);

      // Student can now view / access the published test
      await loginThroughUi(page, student.email);
      const studentResAfter = await page.request.get(`${BASE}/test-series/${series.slug}?testId=${testRow.id}`);
      expect(studentResAfter.ok()).toBe(true);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("2. Draft with all questions complete: Publish from EDIT page -> PUBLISHED, totalTests +1, question ids unchanged", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-editor");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 4,
      });

      const originalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      const originalQIds = originalQuestions.map((q) => q.id);

      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Loading test editor…")).toBeHidden({ timeout: 60_000 });

      // Publish button is next to Save Changes
      const publishBtn = page.getByTestId("publish-edit-button");
      await expect(publishBtn).toBeVisible();

      // Click Publish -> confirm modal opens
      await publishBtn.click();
      const confirmDialog = page.getByTestId("publish-confirm-dialog");
      await expect(confirmDialog).toBeVisible();

      // Confirm publish
      await page.getByTestId("confirm-publish-button").click();

      // Modal closes, edit page marks test as published (Publish button disappears, Published badge shows in structure notice)
      await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
      await expect(publishBtn).toBeHidden();

      // Verify in DB
      const updatedTest = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(updatedTest.isPublished).toBe(true);

      const updatedSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(updatedSeries.totalTests).toBe(1);

      const afterQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(afterQuestions.map((q) => q.id)).toEqual(originalQIds);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("3. Draft with all questions complete: Publish from TEST LIST -> row & counter update, 360px mobile responsive", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-lister");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 3,
      });

      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");

      // Verify published tests counter before
      await expect(page.getByText("Total Tests")).toBeVisible({ timeout: 30_000 });
      const publishedCountBefore = await prisma.examTest.count({
        where: { createdById: teacher.id, isPublished: true },
      });

      // Find the row for this test
      await page.getByPlaceholder("Search tests or categories...").fill(nonce);
      const row = page.locator("tr", { hasText: testRow.title });
      await expect(row).toBeVisible();
      await expect(row.getByText("DRAFT")).toBeVisible();

      // Row action publish button is present
      const rowPublishBtn = row.getByTestId("publish-row-button");
      await expect(rowPublishBtn).toBeVisible();

      // Check min 44px touch target
      const box = await rowPublishBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);

      // Click Publish -> confirm dialog opens
      await rowPublishBtn.click();
      const confirmDialog = page.getByTestId("publish-confirm-dialog");
      await expect(confirmDialog).toBeVisible();

      // Confirm publish
      await page.getByTestId("confirm-publish-button").click();
      await expect(confirmDialog).toBeHidden({ timeout: 15_000 });

      // Row status updates to PUBLISHED without full page reload
      await expect(row.getByText("PUBLISHED")).toBeVisible();
      await expect(row.getByTestId("publish-row-button")).toBeHidden();

      // Published counter incremented in DB
      const updatedSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(updatedSeries.totalTests).toBe(1);

      // Now check 360px mobile viewport: no clipping, actions scrollable
      await page.setViewportSize({ width: 360, height: 740 });
      await page.reload();
      await expect(page.getByText("Total Tests")).toBeVisible();
      await page.getByPlaceholder("Search tests or categories...").fill(nonce);
      const mobileRow = page.locator("tr", { hasText: testRow.title });
      await expect(mobileRow).toBeVisible();
      // Student View and other buttons should be scrollable / accessible
      await expect(mobileRow.getByTitle("Open in Student View")).toBeAttached();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("4. Draft with one incomplete question: Publish blocked on Review & Edit, PATCH returns 400 + details, stays DRAFT", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-incompleter");

    try {
      // 1. Create a draft test where question 2 has empty questionEn
      const slug = slugFor(nonce);
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} Incomplete Series`,
          slug,
          examName: `${nonce} Exam`,
          category: "UPSC",
          createdById: teacher.id,
          isPublished: false,
        },
      });

      const testRow = await prisma.examTest.create({
        data: {
          seriesId: series.id,
          title: `${nonce} Incomplete Test`,
          testType: "FULL_MOCK",
          accessMode: "FREE",
          durationMinutes: 30,
          totalQuestions: 2,
          totalMarks: 2,
          isPublished: false,
          createdById: teacher.id,
          sections: {
            create: [
              {
                title: `${nonce} Section 1`,
                order: 1,
                positiveMarks: 1,
                negativeMarks: 0.25,
                questions: {
                  create: [
                    {
                      ...questionFixture(nonce, 1, "A"),
                      questionType: "MCQ",
                      order: 1,
                    },
                    {
                      ...questionFixture(nonce, 2, "B"),
                      questionEn: "", // INCOMPLETE!
                      questionType: "MCQ",
                      order: 2,
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      // Part A: Direct PATCH returns 400 with details
      await loginThroughUi(page, teacher.email);
      const patchRes = await page.request.patch(`${BASE}/api/exam/test/${testRow.id}`, {
        data: { isPublished: true },
      });
      expect(patchRes.status()).toBe(400);
      const patchJson = await patchRes.json();
      expect(patchJson.error).toContain("incomplete");
      expect(patchJson.details).toBeInstanceOf(Array);
      expect(patchJson.details[0]).toContain("Question 2");

      // Verify in DB: test is still DRAFT, totalTests is still 0
      const testInDb = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(testInDb.isPublished).toBe(false);
      const seriesInDb = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(seriesInDb.totalTests).toBe(0);

      // Part B: Review page has disabled Publish button and jump link
      await page.goto(`/teacher/test-series/${testRow.id}/review`);
      await expect(page.getByText("1 of 2 complete")).toBeVisible({ timeout: 30_000 });

      const isMobile = (testInfo.project.name || "").includes("mobile");
      const topPublishBtn = isMobile
        ? page.getByTestId("mobile-review-publish-button")
        : page.getByTestId("publish-top-bar-button");
      await expect(topPublishBtn).toBeVisible();
      await expect(topPublishBtn).toBeDisabled();

      const jumpLink = isMobile
        ? page.getByTestId("mobile-jump-incomplete-link")
        : page.getByTestId("jump-incomplete-link");
      await expect(jumpLink).toBeVisible();
      await expect(jumpLink).toContainText("1 incomplete");

      // Part C: Edit page shows block banner with error list and jump link
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Loading test editor…")).toBeHidden({ timeout: 60_000 });

      const editPublishBtn = page.getByTestId("publish-edit-button");
      await expect(editPublishBtn).toBeVisible();
      await editPublishBtn.click();

      // Publish modal does NOT open; instead the inline error banner appears
      await expect(page.getByTestId("publish-confirm-dialog")).toBeHidden();
      const blockBanner = page.getByTestId("publish-block-banner");
      await expect(blockBanner).toBeVisible();
      await expect(blockBanner).toContainText("Q2");
      await expect(page.getByTestId("jump-to-q-2")).toBeVisible();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("5. Edit page with unsaved change: Publish saves first, then publishes", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-autosave-pub");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 2,
      });

      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Loading test editor…")).toBeHidden({ timeout: 60_000 });

      // Change question 1 text
      const qInput = page.locator("textarea").first();
      await qInput.fill(`${nonce} Question 1: EDITED BEFORE PUBLISH`);

      // Click Publish directly (without clicking Save Changes first)
      const publishBtn = page.getByTestId("publish-edit-button");
      await publishBtn.click();

      // Confirm dialog appears
      const confirmDialog = page.getByTestId("publish-confirm-dialog");
      await expect(confirmDialog).toBeVisible();

      // Click Publish in dialog (triggers beforePublish which runs handleSave, then PATCH)
      await page.getByTestId("confirm-publish-button").click();
      await expect(confirmDialog).toBeHidden({ timeout: 20_000 });

      // Verify in DB that test is PUBLISHED AND Question 1 has the edited text
      const updatedTest = await prisma.examTest.findUniqueOrThrow({
        where: { id: testRow.id },
        include: { sections: { include: { questions: { orderBy: { order: "asc" } } } } },
      });
      expect(updatedTest.isPublished).toBe(true);
      expect(updatedTest.sections[0].questions[0].questionEn).toBe(`${nonce} Question 1: EDITED BEFORE PUBLISH`);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("6. Ownership check: Teacher cannot publish another teacher's draft (403/404); Admin can publish", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacherA = await createActor(nonce, "TEACHER", "teacher-owner");
    const teacherB = await createActor(nonce, "TEACHER", "teacher-intruder");
    const admin = await createActor(nonce, "ADMIN", "admin-super");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacherA.id,
        published: false,
        questionCount: 2,
      });

      // Teacher B tries to publish Teacher A's draft
      await loginThroughUi(page, teacherB.email);
      const intruderRes = await page.request.patch(`${BASE}/api/exam/test/${testRow.id}`, {
        data: { isPublished: true },
      });
      expect([403, 404]).toContain(intruderRes.status());

      // DB check: test remains DRAFT
      let testInDb = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(testInDb.isPublished).toBe(false);

      // Admin can publish Teacher A's draft
      await loginThroughUi(page, admin.email);
      const adminRes = await page.request.patch(`${BASE}/api/exam/test/${testRow.id}`, {
        data: { isPublished: true },
      });
      expect(adminRes.ok()).toBe(true);

      // DB check: test is now PUBLISHED
      testInDb = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(testInDb.isPublished).toBe(true);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("7. Published test shows no Publish button on list, edit, or review (review shows Published badge)", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-checker");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true, // already PUBLISHED
        questionCount: 2,
      });

      await loginThroughUi(page, teacher.email);

      // 1. Review page: shows Published badge, no Publish button
      await page.goto(`/teacher/test-series/${testRow.id}/review`);
      await expect(page.getByText("2 of 2 complete")).toBeVisible({ timeout: 30_000 });
      const isMobile = (testInfo.project.name || "").includes("mobile");
      const publishedBadge = isMobile
        ? page.getByTestId("mobile-published-badge")
        : page.getByTestId("desktop-published-badge");
      await expect(publishedBadge).toBeVisible({ timeout: 30_000 });
      if (isMobile) {
        await expect(page.getByTestId("mobile-review-publish-button")).toBeHidden();
      } else {
        await expect(page.getByTestId("publish-top-bar-button")).toBeHidden();
      }

      // 2. Edit page: no Publish button next to Save Changes
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Loading test editor…")).toBeHidden({ timeout: 60_000 });
      await expect(page.getByTestId("publish-edit-button")).toBeHidden();

      // 3. Test list: row has no Publish button
      await page.goto("/teacher/test-series");
      await page.getByPlaceholder("Search tests or categories...").fill(nonce);
      const row = page.locator("tr", { hasText: testRow.title });
      await expect(row).toBeVisible();
      await expect(row.getByText("PUBLISHED")).toBeVisible();
      await expect(row.getByTestId("publish-row-button")).toBeHidden();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("8. Created date/time shows exact IST format in Asia/Kolkata, no 'Recent'", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-dater");

    try {
      const fixedDate = new Date("2026-10-17T10:15:00.000Z"); // 3:45 PM IST
      const expectedFormatted = formatIstDateTime(fixedDate);
      expect(expectedFormatted).toBe("17 Oct 2026, 3:45 PM");

      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 1,
      });

      await prisma.examTest.update({
        where: { id: testRow.id },
        data: { createdAt: fixedDate },
      });

      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");
      await page.getByPlaceholder("Search tests or categories...").fill(nonce);

      const row = page.locator("tr", { hasText: testRow.title });
      await expect(row).toBeVisible({ timeout: 30_000 });

      // Verify exact date is rendered and 'Recent' is NOT present
      const dateEl = row.getByTestId("test-created-at");
      await expect(dateEl).toBeVisible();
      const text = await dateEl.innerText();
      expect(text).toContain("17 Oct 2026, 3:45 PM");
      expect(text).not.toContain("Recent");
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("9. Unpublish safety: PATCH isPublished:false returns 400 when attempts exist; decrements totalTests when attempts == 0; no unpublish UI", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-unpublisher");
    const student = await createActor(nonce, "FREE", "student-attempter");

    try {
      // Create published test belonging to a series
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });

      // Update series.totalTests to 1 initially
      await prisma.examSeries.update({
        where: { id: series.id },
        data: { totalTests: 1 },
      });

      // Create 1 attempt
      await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: student.id,
          status: "SUBMITTED",
          score: 1,
          totalMarks: 2,
          correctCount: 1,
          wrongCount: 0,
          skippedCount: 1,
        },
      });

      await loginThroughUi(page, teacher.email);

      // Part A: Attempting to unpublish when attempts > 0 returns 400
      const unpublishWithAttemptsRes = await page.request.patch(`${BASE}/api/exam/test/${testRow.id}`, {
        data: { isPublished: false },
      });
      expect(unpublishWithAttemptsRes.status()).toBe(400);
      const errJson = await unpublishWithAttemptsRes.json();
      expect(errJson.error).toContain("attempts");

      // Verify test is still published, totalTests is still 1
      let dbTest = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow.id } });
      expect(dbTest.isPublished).toBe(true);
      let dbSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series.id } });
      expect(dbSeries.totalTests).toBe(1);

      // Part B: Create another published test with 0 attempts
      const { series: series2, test: testRow2 } = await seedSeriesWithTest({
        nonce: `${nonce}-2`,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });
      await prisma.examSeries.update({
        where: { id: series2.id },
        data: { totalTests: 1 },
      });

      // Unpublish testRow2 (attempts == 0) succeeds and decrements series2.totalTests
      const unpublishZeroAttemptsRes = await page.request.patch(`${BASE}/api/exam/test/${testRow2.id}`, {
        data: { isPublished: false },
      });
      expect(unpublishZeroAttemptsRes.ok()).toBe(true);

      dbTest = await prisma.examTest.findUniqueOrThrow({ where: { id: testRow2.id } });
      expect(dbTest.isPublished).toBe(false);
      dbSeries = await prisma.examSeries.findUniqueOrThrow({ where: { id: series2.id } });
      expect(dbSeries.totalTests).toBe(0);

      // Part C: Verify no unpublish UI exists on list, review, or edit
      await page.goto(`/teacher/test-series/${testRow.id}/review`);
      await expect(page.getByRole("button", { name: /unpublish/i })).toBeHidden();
      await expect(page.getByText("Unpublish", { exact: true })).toBeHidden();

      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Loading test editor…")).toBeHidden({ timeout: 60_000 });
      await expect(page.getByRole("button", { name: /unpublish/i })).toBeHidden();
      await expect(page.getByText("Unpublish", { exact: true })).toBeHidden();

      await page.goto("/teacher/test-series");
      await expect(page.getByRole("button", { name: /unpublish/i })).toBeHidden();
      await expect(page.getByText("Unpublish", { exact: true })).toBeHidden();
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
