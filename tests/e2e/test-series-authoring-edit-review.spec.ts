import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  saveArtifacts,
  seedSeriesWithTest,
  slugFor,
} from "./test-series-e2e-helpers";

test.describe(`${process.env.E2E_RUN_NONCE || "E2E"} test authoring edit and review`, () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("1. Edit published test: in-place update preserves question IDs and existing attempt rows untouched", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-editor");
    const student = await createActor(nonce, "FREE", "student-taker");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 3,
      });

      const originalQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(originalQuestions).toHaveLength(3);
      const originalQIds = originalQuestions.map((q) => q.id);

      // Create an existing attempt with answers by student
      const attempt = await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: student.id,
          status: "SUBMITTED",
          score: 1,
          totalMarks: 3,
          correctCount: 1,
          wrongCount: 0,
          skippedCount: 2,
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

      // Log in as teacher
      await loginThroughUi(page, teacher.email);

      // Navigate to edit page
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);

      // Verify structure locked notice
      await expect(page.getByText("Structure Locked (Published Test)")).toBeVisible();

      // Verify attempts warning banner ("Past attempt scores are not recalculated")
      await expect(page.getByText(/Past attempt scores are not recalculated/i)).toBeVisible();

      // Edit Question 1: change correct answer to B and update explanation
      await page.getByTestId("edit-correct-B").click();
      const expInput = page.getByPlaceholder("Explain why the correct answer is right…");
      await expInput.fill(`${nonce} Updated Explanation for Q1`);

      // Intercept PUT /api/exam/test/[id]/edit-data
      const saveResponsePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/exam/test/${testRow.id}/edit-data`) && res.request().method() === "PUT"
      );

      // Click "Save Changes"
      await page.getByRole("button", { name: "Save Changes" }).click();

      const saveRes = await saveResponsePromise;
      expect(saveRes.status()).toBe(200);

      // Verify success banner appears
      await expect(page.getByText("Test saved successfully!")).toBeVisible();

      // Verify database state: questions updated in place with identical IDs
      const updatedQuestions = await prisma.examQuestion.findMany({
        where: { section: { testId: testRow.id } },
        orderBy: { order: "asc" },
      });
      expect(updatedQuestions).toHaveLength(3);
      expect(updatedQuestions.map((q) => q.id)).toEqual(originalQIds);
      expect(updatedQuestions[0].correctOption).toBe("B");
      expect(updatedQuestions[0].explanationEn).toBe(`${nonce} Updated Explanation for Q1`);

      // Verify attempt and attempt answer rows are completely untouched
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

  test("2. Structure edit attempts on published test are rejected by server with 400", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-structure-check");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 3,
      });

      await loginThroughUi(page, teacher.email);

      // 1. Attempt to add a section
      const addSectionRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
            {
              id: "sec_new",
              name: "Section 2",
              questions: [],
            },
          ],
        },
      });
      expect(addSectionRes.status()).toBe(400);
      const addSectionJson = await addSectionRes.json();
      expect(addSectionJson.error).toContain("Structure locked");

      // 2. Attempt to add a question
      const addQuestionRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              questions: [
                ...testRow.sections[0].questions.map((q) => ({
                  id: q.id,
                  textEnglish: q.questionEn,
                  options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                  correctAnswer: 0,
                })),
                {
                  id: "q_extra",
                  textEnglish: "Extra Question",
                  options: [{ english: "A" }, { english: "B" }, { english: "C" }, { english: "D" }],
                  correctAnswer: 0,
                },
              ],
            },
          ],
        },
      });
      expect(addQuestionRes.status()).toBe(400);
      const addQuestionJson = await addQuestionRes.json();
      expect(addQuestionJson.error).toContain("Structure locked");

      // 3. Attempt to alter marks
      const alterMarksRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              positiveMarks: 4, // original is 1
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
          ],
        },
      });
      expect(alterMarksRes.status()).toBe(400);
      const alterMarksJson = await alterMarksRes.json();
      expect(alterMarksJson.error).toContain("Structure locked");

      // 4. Attempt to alter negative marks
      const alterNegMarksRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              negativeMarks: 1.0,
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
          ],
        },
      });
      expect(alterNegMarksRes.status()).toBe(400);
      expect((await alterNegMarksRes.json()).error).toContain("Structure locked");

      // 5. Attempt to alter duration
      const alterDurationRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          durationMinutes: 999,
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
          ],
        },
      });
      expect(alterDurationRes.status()).toBe(400);
      expect((await alterDurationRes.json()).error).toContain("Structure locked");

      // 6. Attempt to alter testType
      const alterTypeRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          testType: "DIFFERENT_TYPE",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
          ],
        },
      });
      expect(alterTypeRes.status()).toBe(400);
      expect((await alterTypeRes.json()).error).toContain("Structure locked");

      // 7. Attempt to alter section timer
      const alterTimerRes = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: {
          title: "New Title",
          sections: [
            {
              id: testRow.sections[0].id,
              name: "Section 1",
              sectionalTimeMinutes: 45,
              questions: testRow.sections[0].questions.map((q) => ({
                id: q.id,
                textEnglish: q.questionEn,
                options: [{ english: q.optionAEn }, { english: q.optionBEn }, { english: q.optionCEn }, { english: q.optionDEn }],
                correctAnswer: 0,
              })),
            },
          ],
        },
      });
      expect(alterTimerRes.status()).toBe(400);
      expect((await alterTimerRes.json()).error).toContain("Structure locked");
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("3. Ownership: teacher cannot edit or delete another teacher's test; admin can edit any test", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacherOwner = await createActor(nonce, "TEACHER", "owner-teacher");
    const teacherOther = await createActor(nonce, "TEACHER", "other-teacher");
    const admin = await createActor(nonce, "ADMIN", "admin-user");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacherOwner.id,
        published: true,
        questionCount: 2,
      });

      // Teacher Other tries to edit: API should return 403
      await loginThroughUi(page, teacherOther.email);

      const unauthorizedGet = await page.request.get(`/api/exam/test/${testRow.id}/edit-data`);
      expect(unauthorizedGet.status()).toBe(403);

      const unauthorizedPut = await page.request.put(`/api/exam/test/${testRow.id}/edit-data`, {
        data: { title: "Hacked Title", sections: [] },
      });
      expect(unauthorizedPut.status()).toBe(403);

      const unauthorizedDelete = await page.request.delete(`/api/exam/test/${testRow.id}`);
      expect(unauthorizedDelete.status()).toBe(403);

      // UI: navigate to edit page as unauthorized teacher -> error banner
      await page.goto(`/teacher/test-series/${testRow.id}/edit`);
      await expect(page.getByText("Failed to load test")).toBeVisible();
      await expect(page.getByText(/You do not own this test/i)).toBeVisible();

      // Admin can edit: API and UI
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await loginThroughUi(adminPage, admin.email);

      const adminGet = await adminPage.request.get(`/api/exam/test/${testRow.id}/edit-data`);
      expect(adminGet.status()).toBe(200);

      // Admin opens /admin/test-series/[id]/edit
      await adminPage.goto(`/admin/test-series/${testRow.id}/edit`);
      await expect(adminPage.getByText("Structure Locked (Published Test)")).toBeVisible();

      await adminContext.close();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("4. Full Review Page (Q1..N) and Step 4 wizard review integration", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-reviewer");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 3,
      });

      await loginThroughUi(page, teacher.email);

      // Part B saved test review route: /teacher/test-series/[id]/review
      console.log("TEST4: Navigating to review page");
      await page.goto(`/teacher/test-series/${testRow.id}/review`);

      // Verify sticky bar shows "3 of 3 complete"
      console.log("TEST4: Checking complete count");
      await expect(page.getByText("3 of 3 complete")).toBeVisible();

      // Verify all 3 questions appear
      console.log("TEST4: Checking questions");
      await expect(page.getByTestId("review-question-1")).toBeVisible();
      await expect(page.getByTestId("review-question-2")).toBeVisible();
      await expect(page.getByTestId("review-question-3")).toBeVisible();

      // Test language toggle: switch to Hindi
      console.log("TEST4: Checking language toggle");
      await page.getByRole("button", { name: "हिंदी" }).click();
      await page.getByRole("button", { name: "Both" }).click();

      // Test Step 4 Wizard Review: create flow
      console.log("TEST4: Navigating to create page");
      const seriesListPromise = page.waitForResponse(
        (res) => res.url().includes("/api/exam/series/list") && res.status() === 200
      );
      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await seriesListPromise;
      console.log("TEST4: Loaded create page, checking heading");
      await expect(page.getByRole("heading", { name: "Test Authoring Studio" })).toBeVisible();
      await expect(page.getByText("Choose a package above")).not.toBeVisible();

      console.log("TEST4: Filling step 1");
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Step 4 Review Test`);
      await page.getByRole("spinbutton").first().fill("30");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: 2 questions
      console.log("TEST4: Step 2 setting questions");
      await page.getByRole("spinbutton").first().fill("2");
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 3: fill Q1 and Q2
      console.log("TEST4: Step 3 filling Q1");
      await page.getByPlaceholder("Type the question in English…").fill(`${nonce} Step 4 Q1 prompt`);
      for (const l of ["A", "B", "C", "D"]) {
        await page.getByPlaceholder(`Option ${l} (English)`).fill(`Opt ${l}`);
      }
      await page.getByTestId("authoring-correct-A").click();
      await page.getByPlaceholder("Explain why the correct answer is right…").fill("Explanation 1");
      await page.getByRole("button", { name: "Save & Next" }).click();

      console.log("TEST4: Step 3 filling Q2");
      await page.getByPlaceholder("Type the question in English…").fill(`${nonce} Step 4 Q2 prompt`);
      for (const l of ["A", "B", "C", "D"]) {
        await page.getByPlaceholder(`Option ${l} (English)`).fill(`Opt ${l}`);
      }
      await page.getByTestId("authoring-correct-B").click();
      await page.getByPlaceholder("Explain why the correct answer is right…").fill("Explanation 2");

      // Go to Step 4
      console.log("TEST4: Step 3 clicking Preview & Publish");
      const previewBtn = page.getByRole("button", { name: "Preview & Publish" });
      await previewBtn.scrollIntoViewIfNeeded();
      await previewBtn.click();
      console.log("TEST4: Clicked Preview & Publish, waiting for Review all questions");
      await expect(page.getByRole("button", { name: "Review all questions" })).toBeVisible();
      console.log("TEST4: Review all questions button is visible");

      // Open full review from Step 4
      console.log("TEST4: Clicking Review all questions");
      await page.getByRole("button", { name: "Review all questions" }).click();

      // Verify full review displays both questions
      console.log("TEST4: Verifying questions in review");
      await expect(page.getByText(`${nonce} Step 4 Q1 prompt`)).toBeVisible();
      await expect(page.getByText(`${nonce} Step 4 Q2 prompt`)).toBeVisible();
      await expect(page.getByText("2 of 2 complete")).toBeVisible();

      // Click "Back" (the header back button in ReviewAllQuestions)
      console.log("TEST4: Clicking Back");
      await page.getByRole("button", { name: "Back", exact: true }).click();

      // Verify we returned to Step 4 and publish button is intact
      console.log("TEST4: Verifying returned to Step 4");
      await expect(page.getByRole("button", { name: "Publish Test" })).toBeVisible();
      console.log("TEST4: Finished successfully");
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("5. Multi-section sequential fill (10+10 sections), import 15, verify sec1 full and sec2 has 5, undo restores", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-multi-sec");

    try {
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} Multi Section Package`,
          slug: slugFor(`${nonce} Multi Section Package`),
          category: "BPSC",
          examName: "BPSC Prelims",
          createdById: teacher.id,
          isPublished: true,
        },
      });

      await loginThroughUi(page, teacher.email);
      const seriesListPromise = page.waitForResponse(
        (res) => res.url().includes("/api/exam/series/list") && res.status() === 200
      );
      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await seriesListPromise;
      await expect(page.getByRole("heading", { name: "Test Authoring Studio" })).toBeVisible();
      await expect(page.getByText("Choose a package above")).not.toBeVisible();

      // Step 1: Metadata
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Multi Sec Test`);
      await page.getByRole("spinbutton").first().fill("60");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: Configure 2 sections with 10 questions each
      // Section 1 already defaults to 10 questions
      const addSecBtn = page.getByRole("button", { name: "Add Section" });
      await addSecBtn.scrollIntoViewIfNeeded();
      await addSecBtn.click();
      // Section 2 added: fill name and keep default 10 questions
      await page.getByPlaceholder("e.g. General Studies").nth(1).fill("Section 2");

      await expect(page.getByText("Total Questions:")).toBeVisible();
      const nextBtn2 = page.getByRole("button", { name: "Next", exact: true });
      await nextBtn2.scrollIntoViewIfNeeded();
      await nextBtn2.click();

      // Step 3: Verify initial state
      console.log("TEST5: Step 3 checking initial complete");
      await expect(page.getByText("0 of 20 complete")).toBeVisible();

      // Bulk Import 15 questions
      console.log("TEST5: Opening Bulk Import modal");
      const bulkBtn = page.getByRole("button", { name: /Bulk Import \/ AI Generate/ });
      await bulkBtn.scrollIntoViewIfNeeded();
      await bulkBtn.click();
      const fifteenQuestions = Array.from({ length: 15 }, (_, i) => ({
        questionEn: `Multi Sec Q${i + 1} Question Text`,
        options: [`Option A for Q${i + 1}`, `Option B for Q${i + 1}`, `Option C for Q${i + 1}`, `Option D for Q${i + 1}`],
        correctOption: "A",
        explanationEn: `Explanation for Q${i + 1}`,
      }));

      console.log("TEST5: Pasting JSON");
      await page.getByPlaceholder(/Paste raw JSON blocks here/i).fill(JSON.stringify(fifteenQuestions));
      console.log("TEST5: Clicking Process & Preview");
      await page.getByRole("button", { name: "Process & Preview" }).click();
      console.log("TEST5: Waiting for Import 15 questions button");
      const importBtn = page.getByRole("button", { name: "Import 15 questions" });
      await expect(importBtn).toBeVisible();
      await importBtn.click();
      console.log("TEST5: Clicked Import 15 questions");

      // Verify 15 of 20 complete
      await expect(page.getByText("15 of 20 complete")).toBeVisible();
      console.log("TEST5: 15 of 20 complete verified");

      // Section 1 is full (10 of 10 complete)
      await expect(page.getByRole("button", { name: "1", exact: true })).toHaveAttribute("title", "Q1: Complete");
      await expect(page.getByRole("button", { name: "10", exact: true })).toHaveAttribute("title", "Q10: Complete");
      console.log("TEST5: Section 1 items complete verified");

      // Switch to Section 2 (click Section 2 tab in navigator)
      console.log("TEST5: Switching to Section 2");
      await page.getByRole("button", { name: /Section 2/ }).click();
      // Section 2 has Q1-Q5 filled (overall Q11-Q15), Q6-Q10 incomplete (overall Q16-Q20)
      await expect(page.getByRole("button", { name: "1", exact: true })).toHaveAttribute("title", "Q1: Complete");
      await expect(page.getByRole("button", { name: "5", exact: true })).toHaveAttribute("title", "Q5: Complete");
      await expect(page.getByRole("button", { name: "6", exact: true })).toHaveAttribute("title", "Q6: Incomplete");
      console.log("TEST5: Section 2 items verified");

      // Click Undo Import in toast
      console.log("TEST5: Checking Undo button");
      const undoButton = page.getByRole("button", { name: "Undo" });
      await expect(undoButton).toBeVisible();
      await undoButton.click();
      console.log("TEST5: Undo clicked");

      // Verify total stays 20, and complete count returns to 0
      await expect(page.getByText("0 of 20 complete")).toBeVisible();
      console.log("TEST5: 0 of 20 complete verified after undo");
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("6. Step 2 destructive truncation with filled questions prompts confirm; cancel keeps data, accept truncates", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-truncation");

    try {
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} Truncation Series`,
          slug: slugFor(`${nonce} Truncation Series`),
          category: "BPSC",
          examName: "BPSC Prelims",
          createdById: teacher.id,
          isPublished: true,
        },
      });

      await loginThroughUi(page, teacher.email);
      const seriesListPromise = page.waitForResponse(
        (res) => res.url().includes("/api/exam/series/list") && res.status() === 200
      );
      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await seriesListPromise;
      await expect(page.getByRole("heading", { name: "Test Authoring Studio" })).toBeVisible();
      await expect(page.getByText("Choose a package above")).not.toBeVisible();

      // Step 1
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Truncation Test`);
      await page.getByRole("spinbutton").first().fill("30");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: 5 questions
      const countInput = page.getByRole("spinbutton").first();
      await countInput.fill("5");
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 3: fill Q5 specifically (the last question)
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByPlaceholder("Type the question in English…").fill(`${nonce} Filled Question 5`);
      for (const l of ["A", "B", "C", "D"]) {
        await page.getByPlaceholder(`Option ${l} (English)`).fill(`Opt ${l}`);
      }
      await page.getByTestId("authoring-correct-C").click();
      await page.getByPlaceholder("Explain why the correct answer is right…").fill("Explanation 5");

      // Go back to Step 2
      await page.getByRole("button", { name: "Back to Sections" }).click();

      // Case A: User cancels truncation dialog
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("filled question(s) will be removed");
        await dialog.dismiss();
      });

      await countInput.fill("4");
      // Truncation was cancelled: input restores value 5
      await expect(countInput).toHaveValue("5");

      // Verify Q5 is still intact in Step 3
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await expect(page.getByPlaceholder("Type the question in English…")).toHaveValue(`${nonce} Filled Question 5`);

      // Case B: User accepts truncation dialog
      await page.getByRole("button", { name: "Back to Sections" }).click();

      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("filled question(s) will be removed");
        await dialog.accept();
      });

      await countInput.fill("4");
      await expect(countInput).toHaveValue("4");

      // Verify question count is now 4 in Step 3
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByText("Question 1 of 4")).toBeVisible();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("7. Delete test permanently removes it from server and updates series totalTests", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-deleter");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });

      // Update series totalTests to 1 and verify before state
      await prisma.examSeries.update({
        where: { id: series.id },
        data: { totalTests: 1 },
      });
      const beforeSeries = await prisma.examSeries.findUnique({ where: { id: series.id } });
      expect(beforeSeries?.totalTests).toBe(1);

      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");

      // Find the row containing our test title
      await expect(page.getByText(testRow.title)).toBeVisible();

      // Intercept DELETE request
      const deletePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/exam/test/${testRow.id}`) && res.request().method() === "DELETE"
      );

      // Handle the confirmation dialog
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Are you sure you want to delete this test?");
        await dialog.accept();
      });

      // Click delete button on the test row
      const row = page.locator("tr", { hasText: testRow.title });
      await row.getByRole("button", { name: "Delete Test" }).click();

      const deleteRes = await deletePromise;
      expect(deleteRes.status()).toBe(200);

      // Verify row disappeared from UI
      await expect(page.getByText(testRow.title)).not.toBeVisible();

      // Verify permanence after reload
      await page.reload();
      await expect(page.getByText(testRow.title)).not.toBeVisible();

      // Verify test is deleted in database
      const dbTest = await prisma.examTest.findUnique({ where: { id: testRow.id } });
      expect(dbTest).toBeNull();

      // Verify ExamSeries totalTests decremented
      const updatedSeries = await prisma.examSeries.findUnique({ where: { id: series.id } });
      expect(updatedSeries?.totalTests).toBe(0);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("8. Submissions link opens submissions page from test list", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-submissions");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });

      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");
      await expect(page.getByText(testRow.title)).toBeVisible();

      // Click "View Submissions"
      const row = page.locator("tr", { hasText: testRow.title });
      await row.getByRole("link", { name: "View Submissions" }).click();

      // Expect to be on submissions page
      await expect(page).toHaveURL(new RegExp(`/teacher/test-series/${testRow.id}/submissions`));
      await expect(page.getByTestId("submissions-title")).toBeVisible();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("9. Delete test is blocked (409) when student attempts exist, UI shows error banner", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-delete-attempt");
    const student = await createActor(nonce, "FREE", "student-attempter");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });

      // Seed an attempt on this test
      await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: student.id,
          status: "SUBMITTED",
          score: 1.0,
          correctCount: 1,
          wrongCount: 0,
          skippedCount: 1,
          timeTakenSecs: 60,
        },
      });

      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");
      await expect(page.getByText(testRow.title)).toBeVisible();

      // Handle confirmation dialog
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Are you sure you want to delete this test?");
        await dialog.accept();
      });

      // Click delete button
      const row = page.locator("tr", { hasText: testRow.title });
      await row.getByRole("button", { name: "Delete Test" }).click();

      // Verify error banner is displayed
      await expect(page.getByText(/Cannot delete test: this test has 1 existing student attempt/i)).toBeVisible();

      // Verify test is NOT deleted in DB
      const dbTest = await prisma.examTest.findUnique({ where: { id: testRow.id } });
      expect(dbTest).not.toBeNull();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("10. Part G draft edit exception: add/remove question and edit marks on DRAFT preserves IDs", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-draft-edit");

    try {
      const { test: draftTest } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 3,
      });

      const initialQIds = draftTest.sections[0].questions.map((q) => q.id);
      expect(initialQIds.length).toBe(3);

      await loginThroughUi(page, teacher.email);

      // Mutate draft via API: keep Q1, remove Q2, keep Q3, add Q_new, change positiveMarks from 1 to 2.5
      const putRes = await page.request.put(`/api/exam/test/${draftTest.id}/edit-data`, {
        data: {
          title: `${nonce} Updated Draft Title`,
          sections: [
            {
              id: draftTest.sections[0].id,
              name: "Draft Section",
              positiveMarks: 2.5,
              negativeMarks: 0.5,
              questions: [
                {
                  id: initialQIds[0],
                  textEnglish: "Updated Q1 in draft",
                  options: [{ english: "A" }, { english: "B" }, { english: "C" }, { english: "D" }],
                  correctAnswer: 0,
                  difficulty: "Moderate",
                },
                {
                  id: initialQIds[2],
                  textEnglish: "Updated Q3 in draft",
                  options: [{ english: "A" }, { english: "B" }, { english: "C" }, { english: "D" }],
                  correctAnswer: 1,
                  difficulty: "Hard",
                },
                {
                  id: "tmp_new_q4",
                  textEnglish: "Brand new Q4 in draft",
                  options: [{ english: "A" }, { english: "B" }, { english: "C" }, { english: "D" }],
                  correctAnswer: 2,
                  difficulty: "Easy",
                },
              ],
            },
          ],
        },
      });

      expect(putRes.status()).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);

      // Verify in DB:
      const updatedSec = await prisma.examSection.findUnique({
        where: { id: draftTest.sections[0].id },
        include: { questions: true },
      });
      expect(updatedSec?.positiveMarks).toBe(2.5);
      expect(updatedSec?.questions.length).toBe(3);

      const updatedIds = updatedSec?.questions.map((q) => q.id) || [];
      expect(updatedIds).toContain(initialQIds[0]);
      expect(updatedIds).not.toContain(initialQIds[1]);
      expect(updatedIds).toContain(initialQIds[2]);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("10b. Part G draft edit in UI: add/remove question and edit marks on DRAFT through edit page", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-draft-ui");

    try {
      const { test: draftTest } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: false,
        questionCount: 3,
      });

      const initialQIds = draftTest.sections[0].questions.map((q) => q.id);
      expect(initialQIds.length).toBe(3);

      await loginThroughUi(page, teacher.email);
      await page.goto(`/teacher/test-series/${draftTest.id}/edit`);
      await expect(page.getByText("Draft Mode:")).toBeVisible();

      // Change section positive marks to 2.5
      const posMarksInput = page.getByLabel("Section Positive Marks");
      await posMarksInput.fill("2.5");

      // Remove Question 2: navigate to Q2 and click remove button
      await page.getByRole("button", { name: "2", exact: true }).click();
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByLabel("Remove question from draft").click();

      // Add a new Question: click "Add Question to Section"
      await page.getByRole("button", { name: "Add Question to Section" }).click();

      // Fill the new question (it will be active/selected at the end)
      await page.getByPlaceholder("Type question in English…").fill(`${nonce} New Q from UI`);
      for (const l of ["A", "B", "C", "D"]) {
        await page.getByPlaceholder(`Option ${l} in English…`).fill(`Opt ${l}`);
      }
      await page.getByTestId("edit-correct-C").click();
      await page.getByPlaceholder("Explain why the correct answer is right…").fill("UI Explanation");

      // Click "Save Changes"
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Test saved successfully!")).toBeVisible();

      // Verify in database:
      const updatedSec = await prisma.examSection.findUnique({
        where: { id: draftTest.sections[0].id },
        include: { questions: true },
      });
      expect(updatedSec?.positiveMarks).toBe(2.5);
      expect(updatedSec?.questions.length).toBe(3);

      const updatedIds = updatedSec?.questions.map((q) => q.id) || [];
      expect(updatedIds).toContain(initialQIds[0]);
      expect(updatedIds).not.toContain(initialQIds[1]); // removed
      expect(updatedIds).toContain(initialQIds[2]);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("11. Part D Totals: Step 2 footer, Step 3 header, progress bar, Step 4 summary & BOTH CBT preview links show identical N and marks with positiveMarks != 1", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-partd");

    try {
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} Part D Package`,
          slug: slugFor(`${nonce} Part D Package`),
          category: "BPSC",
          examName: "BPSC Prelims",
          createdById: teacher.id,
          isPublished: true,
        },
      });

      await loginThroughUi(page, teacher.email);
      const seriesListPromise = page.waitForResponse(
        (res) => res.url().includes("/api/exam/series/list") && res.status() === 200
      );
      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await seriesListPromise;

      // Step 1: title & duration
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Part D Test`);
      await page.getByRole("spinbutton").first().fill("45");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: 3 questions, positiveMarks = 4, negativeMarks = 0.5
      const numQInput = page.getByRole("spinbutton").first();
      await numQInput.fill("3");
      const posMarksInput = page.getByRole("spinbutton").nth(1);
      await posMarksInput.fill("4");

      // Verify Step 2 footer: N = 3, marks = 12
      await expect(page.getByText("Total Questions:").locator("..")).toContainText("3");
      await expect(page.getByText("Total Marks:").locator("..")).toContainText("12");

      const nextBtn2 = page.getByRole("button", { name: "Next", exact: true });
      await nextBtn2.scrollIntoViewIfNeeded();
      await nextBtn2.click();

      // Step 3: Question 1 of 3, 0 of 3 complete
      await expect(page.getByText("Question 1 of 3")).toBeVisible();
      await expect(page.getByText("0 of 3 complete")).toBeVisible();

      // Fill all 3 questions
      for (let i = 1; i <= 3; i++) {
        await page.getByPlaceholder("Type the question in English…").fill(`${nonce} Part D Q${i}`);
        for (const l of ["A", "B", "C", "D"]) {
          await page.getByPlaceholder(`Option ${l} (English)`).fill(`Opt ${l}`);
        }
        await page.getByTestId("authoring-correct-A").click();
        await page.getByPlaceholder("Explain why the correct answer is right…").fill(`Explanation ${i}`);
        if (i < 3) {
          await page.getByRole("button", { name: "Save & Next" }).click();
        }
      }

      await expect(page.getByText("3 of 3 complete")).toBeVisible();

      // Navigate to Step 4
      const previewBtn = page.getByRole("button", { name: "Preview & Publish" });
      await previewBtn.scrollIntoViewIfNeeded();
      await previewBtn.click();

      // Verify Step 4 summary card: Questions = 3, Total Marks = 12
      await expect(page.getByText("Step 4 — Preview & Publish")).toBeVisible();
      await expect(page.locator("div", { has: page.getByText("Questions", { exact: true }) }).first()).toContainText("3");
      await expect(page.locator("div", { has: page.getByText("Total Marks", { exact: true }) }).first()).toContainText("12");

      // Publish test to display CBT preview links
      const publishBtn = page.getByRole("button", { name: "Publish Test" });
      await publishBtn.scrollIntoViewIfNeeded();
      await publishBtn.click();

      // Verify BOTH CBT preview links contain questions=3 and marks=12
      const cbtLink1 = page.locator("a", { hasText: "Preview CBT Arena" });
      const cbtLink2 = page.locator("a", { hasText: "Preview in CBT Arena →" });

      await expect(cbtLink1).toHaveAttribute("href", new RegExp("questions=3.*marks=12"));
      await expect(cbtLink2).toHaveAttribute("href", new RegExp("questions=3.*marks=12"));
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("12. Review page with 150 questions: measures render time against 2x budget, verifies jump-to-question, and checks 360px mobile viewport (long tasks NOT TESTED)", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-perf");

    try {
      const { test: largeTest } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 150,
      });

      await loginThroughUi(page, teacher.email);

      // Measure render time budget for 150 questions
      const startTime = Date.now();
      await page.goto(`/teacher/test-series/${largeTest.id}/review`);

      // Verify 150 of 150 complete within budget
      await expect(page.getByText("150 of 150 complete")).toBeVisible();
      const renderDuration = Date.now() - startTime;
      console.log(`[MEASURED_RENDER_TIME]: ${renderDuration} ms`);
      // Budget set to ~2x the measured render time (measured ~2391ms, budget 5000ms)
      expect(renderDuration).toBeLessThan(5000);

      // Verify first and 150th question render
      await expect(page.getByTestId("review-question-1")).toBeVisible();
      await expect(page.getByTestId("review-question-150")).toBeVisible();

      // Test jump to Q75
      const jumpInput = page.getByPlaceholder("Q#");
      await jumpInput.fill("75");
      await jumpInput.press("Enter");
      const q75 = page.getByTestId("review-question-75");
      await expect(q75).toBeVisible();
      const q75Box = await q75.boundingBox();
      expect(q75Box).not.toBeNull();

      // 360px viewport check on review page: verify no horizontal layout overflow
      await page.setViewportSize({ width: 360, height: 740 });
      await expect(page.getByText("150 of 150 complete")).toBeVisible();
      await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();

      const noHorizontalOverflowReview = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      });
      expect(noHorizontalOverflowReview).toBe(true);

      // 360px viewport check on edit page
      await page.goto(`/teacher/test-series/${largeTest.id}/edit`);
      await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();

      const noHorizontalOverflowEdit = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
      });
      expect(noHorizontalOverflowEdit).toBe(true);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("13. Admin force delete dialog displays attempt count and executes ?force=true; teacher is blocked", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-force-test");
    const admin = await createActor(nonce, "ADMIN", "admin-force-test");
    const student = await createActor(nonce, "FREE", "student-force-test");

    try {
      const { test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        published: true,
        questionCount: 2,
      });

      // Create an attempt on this test
      await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: student.id,
          status: "SUBMITTED",
          score: 2.0,
          correctCount: 1,
          wrongCount: 0,
          skippedCount: 1,
          timeTakenSecs: 45,
        },
      });

      // 1. Teacher attempts to delete -> blocked with 409 error banner, no force modal
      await loginThroughUi(page, teacher.email);
      await page.goto("/teacher/test-series");
      await expect(page.getByText(testRow.title)).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      const row = page.locator("tr", { hasText: testRow.title });
      await row.getByRole("button", { name: "Delete Test" }).click();

      await expect(page.getByText(/Cannot delete test: this test has 1 existing student attempt/i)).toBeVisible();
      await expect(page.getByTestId("force-delete-modal")).not.toBeVisible();

      // Teacher calling ?force=true via API directly is also rejected with 409
      const teacherForceRes = await page.request.delete(`/api/exam/test/${testRow.id}?force=true`);
      expect(teacherForceRes.status()).toBe(409);

      // Verify test and attempts still exist in DB after teacher force delete rejection
      const testStillExists = await prisma.examTest.findUnique({ where: { id: testRow.id } });
      expect(testStillExists).not.toBeNull();
      const attemptStillExists = await prisma.examAttempt.count({ where: { testId: testRow.id } });
      expect(attemptStillExists).toBe(1);

      // 2. Admin logs in -> clicks delete -> sees force delete modal naming 1 attempt
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await loginThroughUi(adminPage, admin.email);
      await adminPage.goto("/admin/test-series");
      await expect(adminPage.getByText(testRow.title)).toBeVisible();

      adminPage.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      const adminRow = adminPage.locator("tr", { hasText: testRow.title });
      await adminRow.getByRole("button", { name: "Delete Test" }).click();

      // Verify force delete modal is visible and names 1 attempt
      const modal = adminPage.getByTestId("force-delete-modal");
      await expect(modal).toBeVisible();
      await expect(modal.getByText("1 student attempt(s)")).toBeVisible();

      // Click "Force Delete (1 attempts)"
      await modal.getByRole("button", { name: /Force Delete/ }).click();

      // Verify row disappeared
      await expect(adminPage.getByText(testRow.title)).not.toBeVisible();

      // Verify test is deleted in database
      const dbTest = await prisma.examTest.findUnique({ where: { id: testRow.id } });
      expect(dbTest).toBeNull();

      await adminContext.close();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("14. UI-driven overflow warnings: handleAiGenerate and handleRawPaperParse skip excess and show warning", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-ai-overflow");

    try {
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} Overflow Package`,
          slug: slugFor(`${nonce} Overflow Package`),
          category: "BPSC",
          examName: "BPSC Prelims",
          createdById: teacher.id,
          isPublished: true,
        },
      });

      await loginThroughUi(page, teacher.email);
      const seriesListPromise = page.waitForResponse(
        (res) => res.url().includes("/api/exam/series/list") && res.status() === 200
      );
      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await seriesListPromise;

      // Step 1: Metadata
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Overflow Test`);
      await page.getByRole("spinbutton").first().fill("45");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: 2 questions defined for Section 1
      const countInput = page.getByRole("spinbutton").first();
      await countInput.fill("2");
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 3: verify 0 of 2 complete
      await expect(page.getByText("0 of 2 complete")).toBeVisible();

      // Mock /api/exam/ai-parse to return 5 generated questions (exceeds 2 slots)
      await page.route("**/api/exam/ai-parse", async (route) => {
        const reqData = JSON.parse(route.request().postData() || "{}");
        if (reqData.action === "generate-topic") {
          const mockGenerated = Array.from({ length: 5 }, (_, i) => ({
            questionEn: `${nonce} AI Question ${i + 1}`,
            options: ["Opt A", "Opt B", "Opt C", "Opt D"],
            correctOption: "A",
            explanationEn: `AI Explanation ${i + 1}`,
          }));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: { questions: mockGenerated } }),
          });
        } else if (reqData.action === "parse-text") {
          const mockParsed = Array.from({ length: 4 }, (_, i) => ({
            questionEn: `${nonce} Raw Paper Question ${i + 1}`,
            options: ["Opt A", "Opt B", "Opt C", "Opt D"],
            correctOption: "B",
            explanationEn: `Raw Paper Explanation ${i + 1}`,
          }));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: { questions: mockParsed } }),
          });
        } else {
          await route.continue();
        }
      });

      // 1. Test handleAiGenerate overflow
      await page.getByRole("button", { name: /Bulk Import \/ AI Generate/ }).click();
      await page.getByPlaceholder("e.g. Indian Constitution Polity").fill("Indian Polity");
      await page.getByRole("button", { name: "Generate", exact: true }).click();

      // Assert overflow warning is displayed: 3 questions skipped because test is 2
      await expect(page.getByTestId("overflow-warning")).toBeVisible();
      await expect(page.getByTestId("overflow-warning")).toContainText(
        "3 question(s) were skipped because the test is full (2 questions defined in Step 2)"
      );
      await expect(page.getByText("2 of 2 complete")).toBeVisible();

      // Dismiss overflow alert
      await page.getByRole("button", { name: "Dismiss warning" }).click();
      await expect(page.getByTestId("overflow-warning")).not.toBeVisible();

      // Clear Question 2 so we have 1 empty slot for raw paper test
      await page.getByRole("button", { name: "2", exact: true }).click();
      await page.getByPlaceholder("Type the question in English…").fill("");
      await expect(page.getByText("1 of 2 complete")).toBeVisible();

      // 2. Test handleRawPaperParse overflow
      await page.getByRole("button", { name: /Bulk Import \/ AI Generate/ }).click();
      await page.getByPlaceholder(/1\. Who was the first President of India/i).fill("Raw paper pasted text");
      await page.getByRole("button", { name: "Parse & Import to Section" }).click();

      // Assert overflow warning: 3 questions skipped (since 4 returned, 1 slot filled)
      await expect(page.getByTestId("overflow-warning")).toBeVisible();
      await expect(page.getByTestId("overflow-warning")).toContainText(
        "3 question(s) were skipped because the test is full (2 questions defined in Step 2)"
      );
      await expect(page.getByText("2 of 2 complete")).toBeVisible();
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
