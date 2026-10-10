import { test, expect } from "@playwright/test";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  expectedScore,
  loginThroughUi,
  newNonce,
  prisma,
  saveArtifacts,
  seedSeriesWithTest,
} from "./test-series-e2e-helpers";

test.describe(`${process.env.E2E_RUN_NONCE || "E2E"} guest and student test-series journey`, () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("guest catalogue gates attempts; student resumes and submits a fixture-scored free test", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const student = await createActor(nonce, "FREE", "student-a");
    const teacher = await createActor(nonce, "TEACHER", "test-owner");
    try {
      const freeFixture = await seedSeriesWithTest({ nonce: `${nonce}-free`, ownerId: teacher.id, questionCount: 10, durationMinutes: 30 });
      const paidFixture = await seedSeriesWithTest({ nonce: `${nonce}-paid`, ownerId: teacher.id, published: true, accessMode: "PRO", questionCount: 5 });

      // Exercise the app's series write path so its catalogue cache is invalidated after test-DB fixtures are created.
      const teacherContext = await browser.newContext();
      const teacherPage = await teacherContext.newPage();
      expect((await loginThroughUi(teacherPage, teacher.email)).user?.role).toBe("TEACHER");
      for (const fixture of [freeFixture, paidFixture]) {
        const refreshResponse = await teacherPage.request.post("/api/exam/series/create", {
          data: {
            title: fixture.series.title,
            slug: fixture.series.slug,
            category: "BPSC",
            examName: `${nonce} BPSC`,
            isPublished: true,
            isPro: fixture.test.accessMode === "PRO",
          },
        });
        expect(refreshResponse.status()).toBe(200);
      }
      await teacherContext.close();

      const guestSeriesResponse = await page.request.get("/api/exam/series/list?includeAll=1");
      expect(guestSeriesResponse.status()).toBe(200);
      const guestSeriesData = await guestSeriesResponse.json();
      expect(guestSeriesData.data.map((series: { id: string }) => series.id)).toContain(freeFixture.series.slug);

      const guestPageResponse = await page.goto(`/test-series/${freeFixture.series.slug}`);
      expect(guestPageResponse?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: freeFixture.series.title, exact: true })).toBeVisible();
      const attemptsBeforeGuest = await prisma.examAttempt.count({ where: { testId: freeFixture.test.id } });
      const guestStart = await page.request.post("/api/exam/attempt/start", {
        data: { testId: freeFixture.test.id, language: "English" },
      });
      expect(guestStart.status()).toBe(401);
      expect(await prisma.examAttempt.count({ where: { testId: freeFixture.test.id } })).toBe(attemptsBeforeGuest);

      const studentSession = await loginThroughUi(page, student.email);
      expect(studentSession.user?.role).toBe("FREE");
      const paidAttemptCount = await prisma.examAttempt.count({ where: { testId: paidFixture.test.id } });
      const paidStart = await page.request.post("/api/exam/attempt/start", {
        data: { testId: paidFixture.test.id, language: "English" },
      });
      expect(paidStart.status()).toBe(403);
      expect((await paidStart.json()).error).toContain("purchase Pass");
      expect(await prisma.examAttempt.count({ where: { testId: paidFixture.test.id } })).toBe(paidAttemptCount);

      await page.setViewportSize({ width: 375, height: 812 });
      const startResponse = page.waitForResponse((response) =>
        response.url().endsWith("/api/exam/attempt/start") && response.request().method() === "POST");
      await page.goto(`/test-series/${freeFixture.series.slug}/attempt?testId=${freeFixture.test.id}&lang=English`);
      expect([200, 201]).toContain((await startResponse).status());
      await expect(page.getByText(`${nonce}-free Question 1: Which answer matches fixture 1?`)).toBeVisible();
      await expect(page.locator("header span.font-mono")).toBeVisible();
      await expect(page.getByRole("button", { name: "Open Question Palette" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Submit/ }).first()).toBeVisible();
      await expect(page.getByText(`${nonce}-free explanation 1`)).toHaveCount(0);

      const answerKeys = ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"];
      const optionLabel = (index: number, key: string) => `${nonce}-free ${index + 1} option ${key}`;
      const clickOption = async (index: number, key: string) => {
        await page.getByText(optionLabel(index, key), { exact: true }).click();
      };

      // Four fixture-correct answers, then reload and verify server-side resume state.
      for (let i = 0; i < 4; i += 1) {
        await clickOption(i, answerKeys[i]);
        if (i < 3) await page.getByRole("button", { name: "Save & Next" }).click();
      }
      await page.getByRole("button", { name: "Clear", exact: true }).click();
      await clickOption(3, "C");
      await clickOption(3, "D");
      const readTimerSeconds = async () => {
        const timer = await page.locator("header span.font-mono").innerText();
        const parts = timer.split(":").map(Number);
        return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
      };
      const secondsBeforeReload = await readTimerSeconds();
      await expect.poll(async () => prisma.examAttemptAnswer.count({
        where: { attempt: { testId: freeFixture.test.id, userId: student.id, status: "IN_PROGRESS" }, selectedOption: { not: null } },
      }), { timeout: 20_000 }).toBe(4);
      const attemptBeforeReload = await prisma.examAttempt.findFirst({
        where: { testId: freeFixture.test.id, userId: student.id, status: "IN_PROGRESS" },
        include: { answers: true },
      });
      expect(attemptBeforeReload).not.toBeNull();
      expect(attemptBeforeReload!.answers.filter((answer) => answer.selectedOption !== null)).toHaveLength(4);
      const deadlineBeforeReload = attemptBeforeReload!.startedAt.getTime() + freeFixture.test.durationMinutes * 60_000;
      await page.reload();
      await expect(page.getByText(`${nonce}-free Question 4: Which answer matches fixture 4?`)).toBeVisible();
      await expect(page.getByText(optionLabel(3, "D"), { exact: true })).toBeVisible();
      await expect(page.getByText(optionLabel(3, "D"), { exact: true }).locator("xpath=ancestor::label[1]")).toHaveClass(/border-sky-500/);
      const secondsAfterReload = await readTimerSeconds();
      expect(secondsAfterReload).toBeLessThanOrEqual(secondsBeforeReload);
      expect(secondsBeforeReload - secondsAfterReload).toBeLessThan(45);
      expect(attemptBeforeReload!.startedAt.getTime() + freeFixture.test.durationMinutes * 60_000).toBe(deadlineBeforeReload);
      await page.getByRole("button", { name: "Save & Next" }).click();

      // Three wrong answers, three skipped. Score is computed from fixture marks and penalty.
      for (let i = 4; i < 7; i += 1) {
        const wrongChoice = answerKeys[i] === "A" ? "B" : "A";
        await clickOption(i, wrongChoice);
        await page.getByRole("button", { name: "Save & Next" }).click();
      }
      await page.getByRole("button", { name: "Open Question Palette" }).click();
      await expect(page.getByRole("button", { name: "10", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close palette" }).click();
      await page.getByRole("button", { name: /Review & Next/ }).click();
      await page.getByRole("button", { name: "Clear", exact: true }).click();
      await page.getByRole("button", { name: "Submit" }).first().click();
      await expect(page.getByText("Are you sure you want to Submit?")).toBeVisible();
      const submitResponse = page.waitForResponse((response) =>
        response.url().includes("/api/exam/attempt/") && response.url().endsWith("/submit") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Submit Now" }).click();
      const response = await submitResponse;
      expect(response.status()).toBe(200);

      const expected = expectedScore({ correct: 4, wrong: 3, marks: 1, negative: 0.25 });
      const submitted = await prisma.examAttempt.findFirst({
        where: { testId: freeFixture.test.id, userId: student.id, status: "SUBMITTED" },
        include: { answers: true },
      });
      expect(submitted).not.toBeNull();
      expect(submitted!.score).toBe(expected);
      expect(submitted!.correctCount).toBe(4);
      expect(submitted!.wrongCount).toBe(3);
      expect(submitted!.skippedCount).toBe(3);
      expect(submitted!.answers).toHaveLength(10);
      const resultResponse = await page.request.get(`/api/exam/attempt/${submitted!.id}/result`);
      expect(resultResponse.status()).toBe(200);
      const resultJson = await resultResponse.json();
      expect(resultJson.data.score).toBe(expected);
      expect(resultJson.data.correctCount).toBe(4);
      expect(resultJson.data.wrongCount).toBe(3);
      expect(resultJson.data.skippedCount).toBe(3);
      expect(resultJson.data.questionAnalysis).toHaveLength(10);
      const firstQuestionAnalysis = resultJson.data.questionAnalysis.find((item: { questionEn: string }) =>
        item.questionEn === `${nonce}-free Question 1: Which answer matches fixture 1?`);
      const skippedQuestionAnalysis = resultJson.data.questionAnalysis.find((item: { questionEn: string }) =>
        item.questionEn === `${nonce}-free Question 8: Which answer matches fixture 8?`);
      expect(firstQuestionAnalysis?.explanationEn).toBe(`${nonce}-free explanation 1`);
      expect(skippedQuestionAnalysis?.selectedOption).toBeNull();
      await expect(page.getByText(String(expected), { exact: true })).toBeVisible();

      const attemptsAfterSubmit = await prisma.examAttempt.count({ where: { testId: freeFixture.test.id, userId: student.id } });
      const scoreAfterSubmit = submitted!.score;
      const replay = await page.request.post(`/api/exam/attempt/${submitted!.id}/submit`, { data: {} });
      expect([200, 400, 404]).toContain(replay.status());
      expect(await prisma.examAttempt.count({ where: { testId: freeFixture.test.id, userId: student.id } })).toBe(attemptsAfterSubmit);
      expect((await prisma.examAttempt.findUnique({ where: { id: submitted!.id } }))?.score).toBe(scoreAfterSubmit);

      const guestContext = await page.context().browser()!.newContext();
      const freshGuest = await guestContext.newPage();
      const guestSeriesListResponse = await freshGuest.request.get("/api/exam/series/list?includeAll=1");
      expect(guestSeriesListResponse.status()).toBe(200);
      const freshGuestList = await guestSeriesListResponse.json();
      expect(freshGuestList.data.some((series: { id: string }) => series.id === freeFixture.series.slug)).toBe(true);
      expect(freshGuestList.data.some((series: { id: string }) => series.id === paidFixture.series.slug)).toBe(true);
      await guestContext.close();
    } finally {
      await cleanupNonce(nonce);
      await prisma.examSeries.deleteMany({ where: { title: { contains: `${nonce}-` } } });
    }
  });
});
