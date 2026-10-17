import { test, expect } from "@playwright/test";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  saveArtifacts,
  seedSeriesWithTest,
} from "./test-series-e2e-helpers";

test.describe("Replace questions by number on edit page", () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("1. Published test with 70 questions: replace Q39 and Q65, preserve IDs & attempts, test invalid numbers, cancel & undo", async ({ page }) => {
    test.setTimeout(240_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-replacer");
    const student = await createActor(nonce, "FREE", "student-attempter");

    try {
      // 1. Seed published test with 70 questions
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 70,
      });

      const originalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(originalQuestions).toHaveLength(70);
      const originalQIds = originalQuestions.map((q) => q.id);

      // Create an existing student attempt referencing Q1
      const attempt = await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: student.id,
          status: "SUBMITTED",
          score: 1,
          totalMarks: 70,
          correctCount: 1,
          wrongCount: 0,
          skippedCount: 69,
          answers: {
            create: [
              {
                questionId: originalQIds[0],
                selectedOption: "A",
                isCorrect: true,
                marksAwarded: 1,
              },
            ],
          },
        },
        include: { answers: true },
      });
      const originalAnswerId = attempt.answers[0].id;

      // 2. Log in as teacher and navigate to Edit page
      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);

      // Wait for page compilation and loading to complete
      await expect(page.getByText("Loading test editor…")).not.toBeVisible({ timeout: 60_000 });

      // Verify attempts banner
      await expect(page.getByText(/Past attempt scores are not recalculated/i)).toBeVisible({ timeout: 30_000 });

      // 3. Test Invalid question number (999) -> nothing applied, error shown
      await page.getByTestId("open-replace-modal-button").click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const invalidJson = JSON.stringify([
        {
          questionNumber: 999,
          questionEn: "Out of range question text",
          optionAEn: "Opt A",
          optionBEn: "Opt B",
          optionCEn: "Opt C",
          optionDEn: "Opt D",
          correctOption: "A",
        },
      ]);
      await page.getByTestId("replace-json-textarea").fill(invalidJson);
      await page.getByTestId("replace-validate-button").click();

      // Assert error banner appears with message and nothing is applied
      await expect(page.getByTestId("replace-error-banner")).toBeVisible();
      await expect(page.getByTestId("replace-error-banner")).toContainText("out of range");
      await expect(page.getByTestId("replace-confirm-title")).not.toBeVisible();

      // 4. Test Duplicate numbers (e.g. two items for Q39)
      const duplicateJson = JSON.stringify([
        {
          questionNumber: 39,
          questionEn: "First Q39 text",
          optionAEn: "Opt A",
          optionBEn: "Opt B",
          optionCEn: "Opt C",
          optionDEn: "Opt D",
          correctOption: "A",
        },
        {
          questionNumber: 39,
          questionEn: "Second Q39 text",
          optionAEn: "Opt A",
          optionBEn: "Opt B",
          optionCEn: "Opt C",
          optionDEn: "Opt D",
          correctOption: "B",
        },
      ]);
      await page.getByTestId("replace-json-textarea").fill(duplicateJson);
      await page.getByTestId("replace-validate-button").click();

      await expect(page.getByTestId("replace-error-banner")).toBeVisible();
      await expect(page.getByTestId("replace-error-banner")).toContainText("Duplicate questionNumber 39");

      // 5. Test Cancel in confirm dialog -> nothing changes
      const validReplaceJson = JSON.stringify([
        {
          questionNumber: 39,
          questionEn: `${nonce} New Content for Question Thirty-Nine`,
          optionAEn: `${nonce} 39 New Opt A`,
          optionBEn: `${nonce} 39 New Opt B`,
          optionCEn: `${nonce} 39 New Opt C`,
          optionDEn: `${nonce} 39 New Opt D`,
          correctOption: "B",
          explanationEn: `${nonce} 39 Brand New Explanation`,
        },
        {
          questionNumber: 65,
          questionEn: `${nonce} New Content for Question Sixty-Five`,
          optionAEn: `${nonce} 65 New Opt A`,
          optionBEn: `${nonce} 65 New Opt B`,
          optionCEn: `${nonce} 65 New Opt C`,
          optionDEn: `${nonce} 65 New Opt D`,
          correctOption: "C",
          explanationEn: `${nonce} 65 Brand New Explanation`,
        },
      ]);

      await page.getByTestId("replace-json-textarea").fill(validReplaceJson);
      await page.getByTestId("replace-validate-button").click();

      // Confirm preview dialog is visible with expected title
      await expect(page.getByTestId("replace-confirm-title")).toBeVisible();
      await expect(page.getByTestId("replace-confirm-title")).toHaveText("Q39 and Q65 will be replaced");
      await expect(page.getByTestId("replace-diff-item-39")).toBeVisible();
      await expect(page.getByTestId("replace-diff-item-65")).toBeVisible();

      // Click Cancel in confirm dialog
      await page.getByTestId("replace-cancel-button").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Verify nothing changed in DB
      const checkQuestionsAfterCancel = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(checkQuestionsAfterCancel[38].questionEn).toBe(originalQuestions[38].questionEn);
      expect(checkQuestionsAfterCancel[64].questionEn).toBe(originalQuestions[64].questionEn);

      // 6. Test Apply then Undo restores old content
      await page.getByTestId("open-replace-modal-button").click();
      await page.getByTestId("replace-json-textarea").fill(validReplaceJson);
      await page.getByTestId("replace-validate-button").click();
      await page.getByTestId("replace-confirm-button").click();
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Success banner and Undo button should be visible
      await expect(page.getByTestId("replace-success-banner")).toBeVisible();
      await expect(page.getByTestId("replace-undo-button")).toBeVisible();

      // Click Undo
      await page.getByTestId("replace-undo-button").click();
      await expect(page.getByText(/Restored original content for Q39 and Q65/i)).toBeVisible();

      // 7. Apply replace for real and click Save Changes
      await page.getByTestId("open-replace-modal-button").click();
      await page.getByTestId("replace-json-textarea").fill(validReplaceJson);
      await page.getByTestId("replace-validate-button").click();
      await page.getByTestId("replace-confirm-button").click();

      // Intercept PUT /api/exam/test/[id]/edit-data
      const saveResponsePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/exam/test/${testRow.id}/edit-data`) && res.request().method() === "PUT"
      );

      await page.getByRole("button", { name: "Save Changes" }).click();
      const saveRes = await saveResponsePromise;
      expect(saveRes.status()).toBe(200);

      await expect(page.getByText("Test saved successfully!")).toBeVisible();

      // 8. Assert DB state after save:
      const finalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });

      expect(finalQuestions).toHaveLength(70);

      // Question IDs for ALL 70 questions MUST be identical!
      expect(finalQuestions.map((q) => q.id)).toEqual(originalQIds);

      // Q39 (index 38) changed:
      expect(finalQuestions[38].questionEn).toBe(`${nonce} New Content for Question Thirty-Nine`);
      expect(finalQuestions[38].optionAEn).toBe(`${nonce} 39 New Opt A`);
      expect(finalQuestions[38].optionBEn).toBe(`${nonce} 39 New Opt B`);
      expect(finalQuestions[38].optionCEn).toBe(`${nonce} 39 New Opt C`);
      expect(finalQuestions[38].optionDEn).toBe(`${nonce} 39 New Opt D`);
      expect(finalQuestions[38].correctOption).toBe("B");
      expect(finalQuestions[38].explanationEn).toBe(`${nonce} 39 Brand New Explanation`);

      // Q65 (index 64) changed:
      expect(finalQuestions[64].questionEn).toBe(`${nonce} New Content for Question Sixty-Five`);
      expect(finalQuestions[64].optionAEn).toBe(`${nonce} 65 New Opt A`);
      expect(finalQuestions[64].optionBEn).toBe(`${nonce} 65 New Opt B`);
      expect(finalQuestions[64].optionCEn).toBe(`${nonce} 65 New Opt C`);
      expect(finalQuestions[64].optionDEn).toBe(`${nonce} 65 New Opt D`);
      expect(finalQuestions[64].correctOption).toBe("C");
      expect(finalQuestions[64].explanationEn).toBe(`${nonce} 65 Brand New Explanation`);

      // All other 68 questions UNCHANGED:
      for (let i = 0; i < 70; i++) {
        if (i !== 38 && i !== 64) {
          expect(finalQuestions[i].questionEn).toBe(originalQuestions[i].questionEn);
          expect(finalQuestions[i].optionAEn).toBe(originalQuestions[i].optionAEn);
          expect(finalQuestions[i].optionBEn).toBe(originalQuestions[i].optionBEn);
          expect(finalQuestions[i].optionCEn).toBe(originalQuestions[i].optionCEn);
          expect(finalQuestions[i].optionDEn).toBe(originalQuestions[i].optionDEn);
          expect(finalQuestions[i].correctOption).toBe(originalQuestions[i].correctOption);
          expect(finalQuestions[i].explanationEn).toBe(originalQuestions[i].explanationEn);
        }
      }

      // Existing attempt and answer rows remain untouched!
      const afterAttempt = await prisma.examAttempt.findUnique({
        where: { id: attempt.id },
        include: { answers: true },
      });
      expect(afterAttempt).not.toBeNull();
      expect(afterAttempt?.answers).toHaveLength(1);
      expect(afterAttempt?.answers[0].id).toBe(originalAnswerId);
      expect(afterAttempt?.answers[0].questionId).toBe(originalQIds[0]);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("2. Draft test with 70 questions: replace by number and save successfully", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-draft-replacer");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 70,
      });

      const originalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      const originalQIds = originalQuestions.map((q) => q.id);

      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);

      // Wait for page loading to complete
      await expect(page.getByText("Loading test editor…")).not.toBeVisible({ timeout: 60_000 });

      // Verify draft badge
      await expect(page.getByText("DRAFT", { exact: true })).toBeVisible({ timeout: 30_000 });

      // Open replace modal
      await page.getByTestId("open-replace-modal-button").click();

      const draftReplaceJson = JSON.stringify([
        {
          questionNumber: 39,
          questionEn: `${nonce} Draft Replaced Q39`,
          optionAEn: "Draft A",
          optionBEn: "Draft B",
          optionCEn: "Draft C",
          optionDEn: "Draft D",
          correctOption: "D",
          explanationEn: "Draft Exp 39",
        },
        {
          questionNumber: 65,
          questionEn: `${nonce} Draft Replaced Q65`,
          optionAEn: "Draft A65",
          optionBEn: "Draft B65",
          optionCEn: "Draft C65",
          optionDEn: "Draft D65",
          correctOption: "A",
          explanationEn: "Draft Exp 65",
        },
      ]);

      await page.getByTestId("replace-json-textarea").fill(draftReplaceJson);
      await page.getByTestId("replace-validate-button").click();

      await expect(page.getByTestId("replace-confirm-title")).toHaveText("Q39 and Q65 will be replaced");
      await page.getByTestId("replace-confirm-button").click();

      // Save changes
      const saveResponsePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/exam/test/${testRow.id}/edit-data`) && res.request().method() === "PUT"
      );

      await page.getByRole("button", { name: "Save Changes" }).click();
      const saveRes = await saveResponsePromise;
      expect(saveRes.status()).toBe(200);

      // Verify DB
      const finalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(finalQuestions.map((q) => q.id)).toEqual(originalQIds);
      expect(finalQuestions[38].questionEn).toBe(`${nonce} Draft Replaced Q39`);
      expect(finalQuestions[38].correctOption).toBe("D");
      expect(finalQuestions[64].questionEn).toBe(`${nonce} Draft Replaced Q65`);
      expect(finalQuestions[64].correctOption).toBe("A");
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("3. Mobile viewport (360px): replace modal layout and touch targets >= 44px", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 360, height: 740 });
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-mobile-replacer");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 70,
      });

      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);

      // Wait for page loading to complete
      await expect(page.getByText("Loading test editor…")).not.toBeVisible({ timeout: 60_000 });

      // Verify open button touch target >= 44px
      const openBtn = page.getByTestId("open-replace-modal-button");
      await expect(openBtn).toBeVisible({ timeout: 30_000 });
      const btnBox = await openBtn.boundingBox();
      expect(btnBox).not.toBeNull();
      expect(btnBox!.height).toBeGreaterThanOrEqual(44);

      await openBtn.click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();

      // Verify modal width fits 360px viewport without overflow
      const modalBox = await page.locator("[role='dialog'] > div").boundingBox();
      expect(modalBox).not.toBeNull();
      expect(modalBox!.width).toBeLessThanOrEqual(360);

      // Test validate button touch target >= 44px
      const validateBtn = page.getByTestId("replace-validate-button");
      const validateBox = await validateBtn.boundingBox();
      expect(validateBox).not.toBeNull();
      expect(validateBox!.height).toBeGreaterThanOrEqual(44);

      // Fill JSON and preview on mobile
      const mobileJson = JSON.stringify([
        {
          questionNumber: 39,
          questionEn: `${nonce} Mobile Replaced Q39`,
          optionAEn: "M A",
          optionBEn: "M B",
          optionCEn: "M C",
          optionDEn: "M D",
          correctOption: "A",
        },
      ]);

      await page.getByTestId("replace-json-textarea").fill(mobileJson);
      await validateBtn.click();

      await expect(page.getByTestId("replace-confirm-title")).toHaveText("Q39 will be replaced");

      const confirmBtn = page.getByTestId("replace-confirm-button");
      const confirmBox = await confirmBtn.boundingBox();
      expect(confirmBox).not.toBeNull();
      expect(confirmBox!.height).toBeGreaterThanOrEqual(44);

      await confirmBtn.click();
      await expect(modal).not.toBeVisible();

      // Undo button on mobile touch target >= 44px
      const undoBtn = page.getByTestId("replace-undo-button");
      const undoBox = await undoBtn.boundingBox();
      expect(undoBox).not.toBeNull();
      expect(undoBox!.height).toBeGreaterThanOrEqual(44);

      // Save changes
      const saveResponsePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/exam/test/${testRow.id}/edit-data`) && res.request().method() === "PUT"
      );
      await page.getByRole("button", { name: "Save Changes" }).click();
      const saveRes = await saveResponsePromise;
      expect(saveRes.status()).toBe(200);
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
