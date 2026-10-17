import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  beginArtifacts,
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  PASSWORD,
  prisma,
  saveArtifacts,
  slugFor,
} from "./test-series-e2e-helpers";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

test.describe("Student Result Page: 100 Questions Inline Review, Print/PDF, 360px, Security", () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("Complete 100-question review, inline solutions, print layout, 360px, and security rules", async ({ page, request }, testInfo) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-author");
    const studentA = await createActor(nonce, "FREE", "student-owner");
    const studentB = await createActor(nonce, "FREE", "student-other");

    const isMobile = (testInfo.project.name || "").includes("mobile");

    try {
      // 1. Seed Series and Test with 100 questions
      const seriesSlug = slugFor(`${nonce}-result-series`);
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} BPSC 100-Q Mock Series`,
          slug: seriesSlug,
          examName: "BPSC CCE",
          category: "BPSC",
          isPublished: true,
          isFree: true,
          createdById: teacher.id,
        },
      });

      const multiLineQuestion1En = `Consider the following statements regarding the Solar System:\n1. Jupiter is the largest planet.\n2. Mercury is the closest planet to the Sun.\nWhich of the statements given above is/are correct?`;
      const multiLineQuestion1Hi = `सौरमंडल के संबंध में निम्नलिखित कथनों पर विचार करें:\n1. बृहस्पति सबसे बड़ा ग्रह है।\n2. बुध सूर्य का सबसे निकटतम ग्रह है।\nउपरोक्त कथनों में से कौन-सा/से सही है/हैं?`;
      const multiLineExplanation1En = `Both statements 1 and 2 are correct.\nJupiter is indeed the largest planet in our solar system.\nMercury is the innermost and smallest planet.`;
      const multiLineExplanation1Hi = `कथन 1 और 2 दोनों सही हैं।\nबृहस्पति वास्तव में हमारे सौरमंडल का सबसे बड़ा ग्रह है।\nबुध सबसे आंतरिक और सबसे छोटा ग्रह है।`;

      const questionsData = Array.from({ length: 100 }, (_, i) => {
        const qNum = i + 1;
        if (qNum === 1) {
          return {
            order: 1,
            questionType: "MCQ" as const,
            questionEn: multiLineQuestion1En,
            questionHi: multiLineQuestion1Hi,
            optionAEn: "1 only",
            optionAHi: "केवल 1",
            optionBEn: "2 only",
            optionBHi: "केवल 2",
            optionCEn: "Both 1 and 2",
            optionCHi: "1 और 2 दोनों",
            optionDEn: "Neither 1 nor 2",
            optionDHi: "न तो 1 और न ही 2",
            correctOption: "C" as const,
            explanationEn: multiLineExplanation1En,
            explanationHi: multiLineExplanation1Hi,
            positiveMarks: 1.0,
            negativeMarks: 0.25,
            subject: "General Studies",
          };
        }
        return {
          order: qNum,
          questionType: "MCQ" as const,
          questionEn: `${nonce} Question ${qNum}: Which option is correct for item ${qNum}?`,
          questionHi: `${nonce} प्रश्न ${qNum}: प्रश्न संख्या ${qNum} के लिए कौन सा विकल्प सही है?`,
          optionAEn: `Alpha ${qNum}`,
          optionAHi: `अल्फा ${qNum}`,
          optionBEn: `Beta ${qNum}`,
          optionBHi: `बीटा ${qNum}`,
          optionCEn: `Gamma ${qNum}`,
          optionCHi: `गामा ${qNum}`,
          optionDEn: `Delta ${qNum}`,
          optionDHi: `डेल्टा ${qNum}`,
          correctOption: "C" as const,
          explanationEn: `Detailed solution for question ${qNum}: Option C is correct because of specific key fact ${qNum}.`,
          explanationHi: `प्रश्न ${qNum} के लिए विस्तृत समाधान: विकल्प C सही है क्योंकि तथ्य ${qNum}।`,
          positiveMarks: 1.0,
          negativeMarks: 0.25,
          subject: "General Studies",
        };
      });

      const testRow = await prisma.examTest.create({
        data: {
          seriesId: series.id,
          title: `${nonce} Full Mock 100 Questions`,
          testType: "FULL_MOCK",
          accessMode: "FREE",
          durationMinutes: 120,
          totalQuestions: 100,
          totalMarks: 100,
          positiveMarks: 1.0,
          negativeMarks: 0.25,
          isPublished: true,
          createdById: teacher.id,
          sections: {
            create: [
              {
                title: "General Studies",
                order: 1,
                positiveMarks: 1.0,
                negativeMarks: 0.25,
                questions: {
                  create: questionsData,
                },
              },
            ],
          },
        },
        include: {
          sections: {
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      const allCreatedQuestions = testRow.sections[0].questions;
      expect(allCreatedQuestions).toHaveLength(100);

      // 2. Create student A's submitted attempt
      // Student A answered Q1 (C: correct), Q2 (C: correct), Q3 (A: wrong), skipped Q4..Q100 (97 skipped)
      // Score = 1.0 + 1.0 - 0.25 = 1.75
      const attemptA = await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: studentA.id,
          status: "SUBMITTED",
          submittedAt: new Date(),
          score: 1.75,
          totalMarks: 100,
          correctCount: 2,
          wrongCount: 1,
          skippedCount: 97,
          markedCount: 0,
          timeTakenSecs: 140,
          answers: {
            create: [
              {
                questionId: allCreatedQuestions[0].id, // Q1
                selectedOption: "C",
                isCorrect: true,
                marksAwarded: 1.0,
                timeSpentSecs: 45,
              },
              {
                questionId: allCreatedQuestions[1].id, // Q2
                selectedOption: "C",
                isCorrect: true,
                marksAwarded: 1.0,
                timeSpentSecs: 35,
              },
              {
                questionId: allCreatedQuestions[2].id, // Q3
                selectedOption: "A",
                isCorrect: false,
                marksAwarded: -0.25,
                timeSpentSecs: 60,
              },
            ],
          },
        },
      });


      // ── TEST 8 (Part 4 assertion): start and questions APIs whitelist series ──
      console.log("[ASSERTION PART 4] Verifying series response in start and questions APIs...");
      const studentSession = await loginThroughUi(page, studentA.email);
      expect(studentSession).toBeTruthy();

      const startRes = await page.request.post(`${BASE}/api/exam/attempt/start`, {
        data: { testId: testRow.id, language: "English" },
      });
      expect(startRes.ok()).toBe(true);
      const startJson = await startRes.json();
      const startSeries = startJson?.data?.test?.series;
      expect(startSeries).toBeDefined();
      expect(startSeries).not.toHaveProperty("createdById");
      expect(startSeries).not.toHaveProperty("isPublished");
      expect(startSeries).toEqual({
        id: series.id,
        slug: series.slug,
        title: series.title,
        examName: series.examName,
        category: series.category,
      });

      const questionsRes = await page.request.get(`${BASE}/api/exam/${testRow.id}/questions?attemptId=${encodeURIComponent(startJson.data.attemptId)}`);
      expect(questionsRes.ok()).toBe(true);
      const questionsJson = await questionsRes.json();
      const questionsSeries = questionsJson?.data?.test?.series;
      expect(questionsSeries).toBeDefined();
      expect(questionsSeries).not.toHaveProperty("createdById");
      expect(questionsSeries).not.toHaveProperty("isPublished");
      expect(questionsSeries).toEqual({
        id: series.id,
        slug: series.slug,
        title: series.title,
        examName: series.examName,
        category: series.category,
      });

      // Clean up the extra attempt created by startRes
      if (startJson?.data?.attemptId) {
        await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: startJson.data.attemptId } });
        await prisma.examAttempt.deleteMany({ where: { id: startJson.data.attemptId } });
      }

      // ── TEST 6: Security: Student B cannot view Student A's result; unsubmitted attempt returns 409 ──
      console.log("[TEST 6] Verifying security rules on result API...");
      // Create an in-progress unsubmitted attempt for student A to test 409 unsubmitted rule
      const inProgressAttempt = await prisma.examAttempt.create({
        data: {
          testId: testRow.id,
          userId: studentA.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          totalMarks: 100,
        },
      });

      // Unsubmitted attempt by Student A -> 409
      const unsubmittedRes = await page.request.get(`${BASE}/api/exam/attempt/${inProgressAttempt.id}/result`);
      expect(unsubmittedRes.status()).toBe(409);
      const unsubmittedJson = await unsubmittedRes.json();
      expect(unsubmittedJson.questionAnalysis).toBeUndefined();
      expect(unsubmittedJson.error).toContain("Attempt has not been submitted yet");

      // Student B accessing Student A's attempt -> 403
      // Log in as student B to get session
      const loginBRes = await fetch(`${BASE}/api/auth/csrf`);
      const { csrfToken } = await loginBRes.json();
      const csrfCookies = loginBRes.headers.getSetCookie();
      const authBRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": csrfCookies.join("; "),
        },
        body: new URLSearchParams({ email: studentB.email, password: PASSWORD, csrfToken, json: "true" }),
        redirect: "manual",
      });
      const bSessionCookies = authBRes.headers.getSetCookie();
      const bTokenCookie = bSessionCookies.find((c) => c.startsWith("authjs.session-token=") || c.startsWith("__Secure-authjs.session-token="));
      const bCookieHeader = bTokenCookie ? bTokenCookie.split(";")[0] : "";

      const studentBAccessRes = await page.request.get(`${BASE}/api/exam/attempt/${attemptA.id}/result`, {
        headers: { Cookie: bCookieHeader },
      });
      expect(studentBAccessRes.status()).toBe(403);

      // ── TEST 7: Stored score, counts, marks match attempt data ──
      console.log("[TEST 7] Verifying score tiles and counts on result page...");
      await page.goto(`${BASE}/test-series/${seriesSlug}/result?attemptId=${attemptA.id}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify score 1.75
      await expect(page.locator("text=1.75").first()).toBeVisible();
      // Verify correct count 2 (plain count without +/-)
      const correctTile = page.locator("div:has-text('CORRECT')").filter({ hasText: "2" });
      await expect(correctTile.first()).toBeVisible();
      // Verify wrong count 1
      const wrongTile = page.locator("div:has-text('WRONG')").filter({ hasText: "1" });
      await expect(wrongTile.first()).toBeVisible();
      // Verify skipped count 97
      const skippedTile = page.locator("div:has-text('SKIPPED')").filter({ hasText: "97" });
      await expect(skippedTile.first()).toBeVisible();

      // ── TEST 1: Question-wise Review shows all 100 questions on one scrolling page ──
      console.log("[TEST 1] Switching to Question-wise Review tab...");
      const reviewTab = page.getByRole("button", { name: /Question-wise Review/i });
      await reviewTab.click();

      // Exactly 100 cards render
      const questionCards = page.locator("article.review-question-card");
      await expect(questionCards).toHaveCount(100);

      // Q100 is reachable by jump
      console.log("[TEST 1] Testing jump to Q100...");
      const jumpInput = page.getByLabel("Jump to question number");
      await jumpInput.fill("100");
      await page.locator("button:has-text('Jump')").click();
      await page.waitForTimeout(300);

      const q100Card = page.locator("#review-question-100");
      await expect(q100Card).toBeVisible();

      // Q100 text, 4 options, and explanation are visible inline
      await expect(q100Card).toContainText("Question 100");
      await expect(q100Card).toContainText("Alpha 100");
      await expect(q100Card).toContainText("Gamma 100");
      await expect(q100Card).toContainText("Detailed solution for question 100");

      // Q100 was skipped: status is Skipped, Correct answer badge is on Option C
      await expect(q100Card.locator("text=Skipped").first()).toBeVisible();
      await expect(q100Card.locator("text=Correct answer").first()).toBeVisible();

      // Check Q1: Correct status, student selected C, correct is C, explanation visible
      console.log("[TEST 1] Checking Q1 (correct) and Q3 (wrong)...");
      const q1Card = page.locator("#review-question-1");
      await q1Card.scrollIntoViewIfNeeded();
      await expect(q1Card).toBeVisible();
      await expect(q1Card.locator("text=Correct").first()).toBeVisible();
      await expect(q1Card.locator("text=Your answer").first()).toBeVisible();
      await expect(q1Card.locator("text=Correct answer").first()).toBeVisible();
      await expect(q1Card).toContainText("Jupiter is indeed the largest planet");

      // Check Q3: Wrong status, student selected A, correct is C
      const q3Card = page.locator("#review-question-3");
      await q3Card.scrollIntoViewIfNeeded();
      await expect(q3Card.locator("text=Wrong").first()).toBeVisible();
      await expect(q3Card.locator("text=Your answer").first()).toBeVisible();
      await expect(q3Card.locator("text=Correct answer").first()).toBeVisible();

      // ── TEST 2: Language toggle (Hindi, Both, English) ──
      console.log("[TEST 2] Testing language toggles...");
      // Click हिंदी
      await page.getByRole("button", { name: "हिंदी" }).click();
      await expect(q1Card).toContainText("सौरमंडल के संबंध में");
      await expect(q1Card).toContainText("कथन 1 और 2 दोनों सही हैं");

      // Click Both
      await page.getByRole("button", { name: "Both" }).click();
      await expect(q1Card).toContainText("Consider the following statements");
      await expect(q1Card).toContainText("सौरमंडल के संबंध में");

      // Click English
      await page.getByRole("button", { name: "English" }).click();
      await expect(q1Card).toContainText("Consider the following statements");

      // ── TEST 3: Multi-line statement question formatting ──
      console.log("[TEST 3] Testing multi-line statement question layout...");
      const q1QuestionText = await q1Card.locator(".whitespace-pre-line").first().textContent();
      expect(q1QuestionText).toContain("1. Jupiter is the largest planet.");
      expect(q1QuestionText).toContain("2. Mercury is the closest planet to the Sun.");

      // ── TEST 4: Print media and page.pdf() check ──
      console.log("[TEST 4] Testing print media and PDF generation...");
      await page.emulateMedia({ media: "print" });

      // "View Solution" buttons, navigation, and sticky bar are hidden in print media
      await expect(page.locator("button:has-text('View Solution')").first()).toBeHidden();
      await expect(page.locator("header")).toBeHidden();
      await expect(page.locator(".review-sticky-bar")).toBeHidden();

      // Print summary header is visible
      await expect(page.locator(".print-header-summary")).toBeVisible();

      // Generate PDF if desktop chromium
      if (!isMobile) {
        const artifactsDir = path.join(process.cwd(), "test-results", "pdf-check");
        await fs.mkdir(artifactsDir, { recursive: true });
        const pdfPath = path.join(artifactsDir, `${nonce}-result.pdf`);
        const pdfTxtPath = path.join(artifactsDir, `${nonce}-result.txt`);

        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        console.log(`[PDF GENERATED] path=${pdfPath}`);

        try {
          execSync(`/opt/homebrew/bin/pdftotext "${pdfPath}" "${pdfTxtPath}"`);
          const extractedText = await fs.readFile(pdfTxtPath, "utf-8");

          // Assert Q100 text and explanation appear in PDF
          expect(extractedText).toContain("Question 100");
          expect(extractedText).toContain("Detailed solution for question 100");
          console.log("[PDF ASSERTION PASSED] Q100 text and explanation found in generated PDF!");

          // Print page count
          const pdfInfoOutput = execSync(`/opt/homebrew/bin/pdfinfo "${pdfPath}"`).toString();
          const pagesMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
          const pageCount = pagesMatch ? pagesMatch[1] : "unknown";
          console.log(`[PDF PAGE COUNT] Pages: ${pageCount}`);
        } catch (err: any) {
          console.error(`pdftotext/pdfinfo execution failed: ${err.message}`);
          throw err;
        }
      }

      await page.emulateMedia({ media: null });

      // ── TEST 5: Responsive 360px viewport check ──
      console.log("[TEST 5] Testing 360px viewport for horizontal overflow and touch targets...");
      await page.setViewportSize({ width: 360, height: 740 });
      await page.waitForTimeout(300);

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // Check touch targets: buttons in sticky bar have minHeight >= 44
      const stickyButtons = await page.locator(".review-sticky-bar button, .review-sticky-bar input").all();
      for (const btn of stickyButtons) {
        const box = await btn.boundingBox();
        if (box && box.height > 0) {
          expect(box.height).toBeGreaterThanOrEqual(40); // 40-44px touch targets
        }
      }
      console.log("[TEST 5 PASSED] 360px has no horizontal overflow and touch targets >= 40-44px.");

    } finally {
      await cleanupNonce(nonce);
    }
  });
});
