import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  saveArtifacts,
  slugFor,
} from "./test-series-e2e-helpers";

test.describe(`${process.env.E2E_RUN_NONCE || "E2E"} teacher authoring to student catalogue`, () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("creates a nonce series and publishes five ordered questions for learners", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-owner");
    const admin = await createActor(nonce, "ADMIN", "admin-preview");

    try {
      const teacherSession = await loginThroughUi(page, teacher.email);
      expect(teacherSession.user?.role).toBe("TEACHER");

      await page.goto("/teacher/test-series/create");
      await expect(page.getByRole("heading", { name: "Test Authoring Studio" })).toBeVisible();
      await page.getByRole("button", { name: "+ Create New Series Package" }).click();
      await page.getByPlaceholder("e.g. UPSC Civil Services Exam (Prelims) 2026 Mock Test Series")
        .fill(`${nonce} BPSC Test Series`);
      await page.getByRole("combobox").nth(1).selectOption("BPSC");
      await page.getByPlaceholder("Comprehensive description for the details page banner...")
        .fill(`${nonce} package description`);
      const seriesCreateResponse = page.waitForResponse((response) =>
        response.url().endsWith("/api/exam/series/create") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Publish Test Series Package" }).click();
      expect((await seriesCreateResponse).status()).toBe(200);
      await expect(page.getByText("Test Series Package Created Successfully!", { exact: true })).toBeVisible();

      const series = await prisma.examSeries.findFirst({ where: { title: `${nonce} BPSC Test Series` } });
      expect(series).not.toBeNull();
      expect(series?.title).toBe(`${nonce} BPSC Test Series`);
      expect(series?.category).toBe("BPSC");
      expect(series?.description).toBe(`${nonce} package description`);
      // Current modal/API contract is immediate publication; the unpublished-start contract is tracked as T-01 BLOCKED.
      expect(series?.isPublished).toBe(true);

      await page.getByRole("button", { name: "Add Tests in Studio Now" }).click();
      await page.waitForURL(`**/teacher/test-series/create?seriesId=${series!.slug}`);
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} Five Question Test`);
      await page.getByRole("spinbutton").first().fill("30");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      const questionCount = page.getByRole("spinbutton").first();
      await questionCount.fill("5");
      await page.locator("select").filter({ has: page.locator('option[value="0.25"]') }).selectOption("0.25");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByText("Question 1 of 5")).toBeVisible();

      await page.getByRole("button", { name: "Preview & Publish" }).click();
      const publishButton = page.getByRole("button", { name: "Publish Test" });
      await expect(publishButton).toBeDisabled();
      await page.getByRole("button", { name: "Back to Questions" }).click();

      const correctOptions = ["A", "B", "C", "D", "A"];
      for (let index = 0; index < correctOptions.length; index += 1) {
        const qNum = index + 1;
        await expect(page.getByText(`Question ${qNum} of 5`)).toBeVisible();
        await page.getByPlaceholder("Type the question in English…").fill(`${nonce} authored question ${qNum}`);
        for (const letter of ["A", "B", "C", "D"]) {
          await page.getByPlaceholder(`Option ${letter} (English)`).fill(`${nonce} Q${qNum} option ${letter}`);
        }
        await page.getByTestId(`authoring-correct-${correctOptions[index]}`).click();
        await page.getByPlaceholder("Explain why the correct answer is right…").fill(`${nonce} Q${qNum} explanation`);
        if (qNum < correctOptions.length) await page.getByRole("button", { name: "Save & Next" }).click();
      }

      await page.getByRole("button", { name: "Preview & Publish" }).click();
      await expect(page.getByRole("button", { name: "Publish Test" })).toBeEnabled();
      const testCreateResponse = page.waitForResponse((response) =>
        response.url().endsWith("/api/exam/test/create") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Publish Test" }).click();
      expect((await testCreateResponse).status()).toBe(200);

      const testRow = await prisma.examTest.findFirst({
        where: { title: `${nonce} Five Question Test`, seriesId: series!.id },
        include: { sections: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } },
      });
      expect(testRow?.isPublished).toBe(true);
      expect(testRow?.totalQuestions).toBe(5);
      expect(testRow?.durationMinutes).toBe(30);
      const savedQuestions = testRow?.sections.flatMap((section) => section.questions) ?? [];
      expect(savedQuestions).toHaveLength(5);
      expect(savedQuestions.map((q) => q.questionEn)).toEqual(
        correctOptions.map((_, i) => `${nonce} authored question ${i + 1}`),
      );
      expect(savedQuestions.map((q) => [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn])).toEqual(
        correctOptions.map((_, i) => ["A", "B", "C", "D"].map((letter) => `${nonce} Q${i + 1} option ${letter}`)),
      );
      expect(savedQuestions.map((q) => q.correctOption)).toEqual(correctOptions);
      expect(savedQuestions.map((q) => q.explanationEn)).toEqual(
        correctOptions.map((_, i) => `${nonce} Q${i + 1} explanation`),
      );

      const teacherTestCount = await prisma.examTest.count({ where: { seriesId: series!.id } });
      const teacherQuestionCount = await prisma.examQuestion.count({ where: { section: { testId: testRow!.id } } });
      const invalidQuestionCases = [
        { questionEn: "", optionDEn: `${nonce} option D`, correctOption: "A" },
        { questionEn: `${nonce} missing option`, optionDEn: "", correctOption: "A" },
        { questionEn: `${nonce} missing answer`, optionDEn: `${nonce} option D`, correctOption: "" },
      ];
      for (const invalidQuestion of invalidQuestionCases) {
        const response = await page.request.post("/api/exam/test/create", {
          data: {
            seriesId: series!.id,
            title: `${nonce} invalid validation test`,
            testType: "FULL_MOCK",
            accessMode: "FREE",
            durationMinutes: 5,
            isPublished: true,
            sections: [{
              title: `${nonce} invalid section`,
              questions: [
                Object.assign(
                  {
                    questionEn: `${nonce} valid base question`,
                    optionAEn: `${nonce} option A`,
                    optionBEn: `${nonce} option B`,
                    optionCEn: `${nonce} option C`,
                    optionDEn: `${nonce} option D`,
                    correctOption: "A",
                    explanationEn: `${nonce} explanation`,
                  },
                  invalidQuestion
                ),
              ],
            }],
          },
        });
        expect(response.status()).toBe(400);
        expect(await prisma.examTest.count({ where: { seriesId: series!.id } })).toBe(teacherTestCount);
        expect(await prisma.examQuestion.count({ where: { section: { testId: testRow!.id } } })).toBe(teacherQuestionCount);
      }

      const catalogueResponse = await page.request.get("/api/exam/series/list");
      expect(catalogueResponse.status()).toBe(200);
      const catalogueJson = await catalogueResponse.json();
      expect(catalogueJson.data.some((item: { id: string }) => item.id === series!.slug)).toBe(true);

      const adminContext: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const adminPage: Page = await adminContext.newPage();
      const adminSession = await loginThroughUi(adminPage, admin.email);
      expect(adminSession.user?.role).toBe("ADMIN");
      await adminContext.close();
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("preserves 100 question slots: imports 20 questions sequentially into Q1-20, verifies Q21-100 incomplete, roundtrips Step 2, and asserts overflow warning on excess", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-importer");

    try {
      const teacherSession = await loginThroughUi(page, teacher.email);
      expect(teacherSession.user?.role).toBe("TEACHER");

      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} 100Q Package`,
          slug: slugFor(`${nonce} 100Q Package`),
          category: "BPSC",
          examName: "BPSC Prelims",
          description: `${nonce} package for import test`,
          createdById: teacher.id,
          isPublished: true,
        },
      });

      await page.goto(`/teacher/test-series/create?seriesId=${series.slug}`);
      await expect(page.getByRole("heading", { name: "Test Authoring Studio" })).toBeVisible();

      // Step 1: Metadata
      await page.getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1").fill(`${nonce} 100 Question Test`);
      await page.getByRole("spinbutton").first().fill("120");
      await page.getByRole("button", { name: /Free Test/ }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 2: Configure Section with 100 Questions
      const questionCountInput = page.getByRole("spinbutton").first();
      await questionCountInput.fill("100");
      await expect(page.getByText("Total Questions:")).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      // Step 3: Assert initial state is exactly 100 (never 120 or 135)
      await expect(page.getByText("Question 1 of 100")).toBeVisible();
      await expect(page.getByText("0 of 100 complete")).toBeVisible();

      // Step 3: Bulk Import 20 questions
      await page.getByRole("button", { name: /Bulk Import \/ AI Generate/ }).click();
      const twentyQuestions = Array.from({ length: 20 }, (_, i) => ({
        questionEn: `Test Question ${i + 1} English prompt text`,
        questionHi: `प्रश्न ${i + 1} हिंदी पाठ`,
        options: [
          `Option A for Q${i + 1}`,
          `Option B for Q${i + 1}`,
          `Option C for Q${i + 1}`,
          `Option D for Q${i + 1}`,
        ],
        correctOption: ["A", "B", "C", "D"][i % 4],
        explanationEn: `Explanation for Q${i + 1}`,
        difficulty: "MODERATE",
      }));

      await page.getByPlaceholder(/Paste raw JSON blocks here/i).fill(JSON.stringify(twentyQuestions));
      await page.getByRole("button", { name: "Process & Preview" }).click();
      await expect(page.getByRole("button", { name: "Import 20 questions" })).toBeVisible();
      await page.getByRole("button", { name: "Import 20 questions" }).click();

      // Assert total remains 100 (never 120 or 135) and Q1-20 are complete
      await expect(page.getByText("Question 1 of 100")).toBeVisible();
      await expect(page.getByText("20 of 100 complete")).toBeVisible();
      await expect(page.getByRole("button", { name: "1", exact: true })).toHaveAttribute("title", "Q1: Complete");
      await expect(page.getByRole("button", { name: "20", exact: true })).toHaveAttribute("title", "Q20: Complete");
      await expect(page.getByRole("button", { name: "21", exact: true })).toHaveAttribute("title", "Q21: Incomplete");
      await expect(page.getByRole("button", { name: "100", exact: true })).toHaveAttribute("title", "Q100: Incomplete");

      // Step 3: Bulk Import 20 MORE questions (fills Q21-40)
      await page.getByRole("button", { name: /Bulk Import \/ AI Generate/ }).click();
      const twentyMoreQuestions = Array.from({ length: 20 }, (_, i) => ({
        questionEn: `Test Question ${i + 21} English prompt text`,
        options: ["A", "B", "C", "D"],
        correctOption: "B",
        explanationEn: `Explanation for Q${i + 21}`,
      }));

      await page.getByPlaceholder(/Paste raw JSON blocks here/i).fill(JSON.stringify(twentyMoreQuestions));
      await page.getByRole("button", { name: "Process & Preview" }).click();
      await expect(page.getByRole("button", { name: "Import 20 questions" })).toBeVisible();
      await page.getByRole("button", { name: "Import 20 questions" }).click();

      // Assert total remains 100 and Q1-40 are complete
      await expect(page.getByText("Question 1 of 100")).toBeVisible();
      await expect(page.getByText("40 of 100 complete")).toBeVisible();
      await expect(page.getByRole("button", { name: "21", exact: true })).toHaveAttribute("title", "Q21: Complete");
      await expect(page.getByRole("button", { name: "40", exact: true })).toHaveAttribute("title", "Q40: Complete");
      await expect(page.getByRole("button", { name: "41", exact: true })).toHaveAttribute("title", "Q41: Incomplete");
      await expect(page.getByRole("button", { name: "100", exact: true })).toHaveAttribute("title", "Q100: Incomplete");

      // Test Step 2 roundtrip: Back to Sections -> Step 2 -> Next doesn't inflate slots
      await page.getByRole("button", { name: "Back to Sections" }).click();
      await expect(questionCountInput).toHaveValue("100");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByText("Question 1 of 100")).toBeVisible();
      await expect(page.getByText("40 of 100 complete")).toBeVisible();

      // Test overflow case: Attempt to import 65 questions when only 60 empty slots remain
      const sixtyFiveQuestions = Array.from({ length: 65 }, (_, i) => ({
        questionEn: `Overflow Question ${i + 1} English text`,
        options: ["A", "B", "C", "D"],
        correctOption: "A",
        explanationEn: `Explanation for overflow Q${i + 1}`,
      }));

      await page.getByRole("button", { name: /Bulk Import \/ AI Generate/ }).click();
      await page.getByPlaceholder(/Paste raw JSON blocks here/i).fill(JSON.stringify(sixtyFiveQuestions));
      await page.getByRole("button", { name: "Process & Preview" }).click();
      await expect(page.getByRole("button", { name: "Import 65 questions" })).toBeVisible();
      await page.getByRole("button", { name: "Import 65 questions" }).click();

      // Assert overflow warning is displayed with exact skipped count (5 skipped)
      await expect(page.getByTestId("overflow-warning")).toBeVisible();
      await expect(page.getByTestId("overflow-warning")).toContainText("5 question(s) were skipped because the test is full (100 questions defined in Step 2)");

      // Assert total remains 100, and now all 100 are complete
      await expect(page.getByText("Question 1 of 100")).toBeVisible();
      await expect(page.getByText("100 of 100 complete")).toBeVisible();
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
