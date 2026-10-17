import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
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

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

async function takeStepScreenshot(page: any, name: string) {
  const dir = path.join(process.cwd(), "test-results", "golden-path");
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
}

test.describe("Golden Path: Authoring to Student CBT Journey (UPSC vs BPSC)", () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("UPSC test: 2 sections, 4 options, marks 2/-0.66, multi-line statements -> Review -> Publish -> Admin Edit URL check -> Student CBT check -> Submit -> Solutions", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await prisma.$connect();
    const nonce = newNonce();
    const admin = await createActor(nonce, "ADMIN", "admin-author");
    const student = await createActor(nonce, "FREE", "student-candidate");

    const isMobile = (testInfo.project.name || "").includes("mobile");

    try {
      // 1. Seed UPSC Series with a 2-section test
      const seriesSlug = slugFor(`${nonce}-upsc-cse`);
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} UPSC Civil Services Mock 2026`,
          slug: seriesSlug,
          examName: "UPSC CSE",
          category: "UPSC",
          isPublished: true,
          isFree: true,
          createdById: admin.id,
        },
      });

      const multilineQ1 = `Consider the following statements regarding the Himalayas:\n1. They are young fold mountains.\n2. Mount Everest is located in the Greater Himalayas.\nWhich of the statements given above is/are correct?`;
      const multilineExp1 = `Both statements are correct.\n1. The Himalayas are geologically young and structurally fold mountains.\n2. Mount Everest lies in the Great Himalaya range.`;

      const testRow = await prisma.examTest.create({
        data: {
          seriesId: series.id,
          title: `${nonce} UPSC Prelims Mock Paper 1`,
          testType: "FULL_MOCK",
          accessMode: "FREE",
          durationMinutes: 120,
          totalQuestions: 2,
          totalMarks: 4.5,
          positiveMarks: 2,
          negativeMarks: 0.66,
          isPublished: false,
          createdById: admin.id,
          sections: {
            create: [
              {
                title: "General Studies",
                order: 1,
                positiveMarks: 2,
                negativeMarks: 0.66,
                questions: {
                  create: [
                    {
                      questionEn: multilineQ1,
                      optionAEn: "1 only\n(First statement is correct)",
                      optionBEn: "2 only",
                      optionCEn: "Both 1 and 2",
                      optionDEn: "Neither 1 nor 2",
                      correctOption: "C",
                      explanationEn: multilineExp1,
                      positiveMarks: 2,
                      negativeMarks: 0.66,
                      order: 1,
                      subject: "Geography",
                      questionType: "MCQ",
                    },
                  ],
                },
              },
              {
                title: "CSAT",
                order: 2,
                positiveMarks: 2.5,
                negativeMarks: 0.83,
                questions: {
                  create: [
                    {
                      questionEn: `A train running at 54 km/hr takes 20 seconds to pass a platform.\nWhat is the length of the train if the platform is 100m long?`,
                      optionAEn: "200 meters",
                      optionBEn: "300 meters",
                      optionCEn: "400 meters",
                      optionDEn: "500 meters",
                      correctOption: "A",
                      explanationEn: `Speed = 54 * 5/18 = 15 m/s.\nDistance = Speed * Time = 15 * 20 = 300m.\nTrain length = 300 - 100 = 200m.`,
                      positiveMarks: 2.5,
                      negativeMarks: 0.83,
                      order: 2,
                      subject: "Quantitative Aptitude",
                      questionType: "MCQ",
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      // ─────────────────────────────────────────────────────────────
      // STEP 1: Admin logs in, views Review page, checks breadcrumb & Edit URL
      // ─────────────────────────────────────────────────────────────
      await loginThroughUi(page, admin.email);
      await page.goto(`/admin/test-series/${testRow.id}/review`);

      // Check Review page loads and shows "2 of 2 complete"
      await expect(page.getByText("2 of 2 complete")).toBeVisible({ timeout: 45_000 });

      // Check Breadcrumb does NOT show raw test cuid
      const breadcrumbNav = page.locator("nav[aria-label='Breadcrumbs']");
      if (await breadcrumbNav.isVisible()) {
        const breadcrumbText = await breadcrumbNav.innerText();
        expect(breadcrumbText).not.toContain(testRow.id);
      }

      // Check multi-line question text rendered with whitespace-pre-line
      await expect(page.getByText("Consider the following statements regarding the Himalayas:")).toBeVisible();
      await expect(page.getByText("1. They are young fold mountains.")).toBeVisible();

      // Check section names displayed
      await expect(page.getByText("General Studies").first()).toBeVisible();
      await expect(page.getByText("CSAT").first()).toBeVisible();

      await takeStepScreenshot(page, `${testInfo.project.name}-01-admin-review-page`);

      // Check Edit question button navigates to /admin/test-series/${testRow.id}/edit (NOT /teacher/...)
      const editButtons = page.getByRole("button", { name: /Edit question/i });
      if (await editButtons.first().isVisible()) {
        await editButtons.first().click();
        await page.waitForURL(`**/admin/test-series/${testRow.id}/edit**`);
        expect(page.url()).toContain(`/admin/test-series/${testRow.id}/edit`);
        expect(page.url()).not.toContain("/teacher/");

        await takeStepScreenshot(page, `${testInfo.project.name}-02-admin-edit-page`);

        // Go back to review page
        await page.goto(`/admin/test-series/${testRow.id}/review`);
        await expect(page.getByText("2 of 2 complete")).toBeVisible({ timeout: 30_000 });
      }

      // Publish the test from Review page
      const publishBtn = isMobile
        ? page.getByTestId("mobile-review-publish-button")
        : page.getByTestId("publish-top-bar-button");
      await expect(publishBtn).toBeVisible();
      await expect(publishBtn).toBeEnabled();
      await publishBtn.click();

      const confirmDialog = page.getByTestId("publish-confirm-dialog");
      await expect(confirmDialog).toBeVisible();
      await page.getByTestId("confirm-publish-button").click();

      // Verify published banner
      await expect(page.getByTestId("publish-success-banner")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Test published successfully/i)).toBeVisible();
      await takeStepScreenshot(page, `${testInfo.project.name}-03-admin-published`);

      // ─────────────────────────────────────────────────────────────
      // STEP 2: Student logs in and enters CBT Arena
      // ─────────────────────────────────────────────────────────────
      await loginThroughUi(page, student.email);

      // Student starts attempt
      await page.goto(`/test-series/${series.slug}/attempt?testId=${testRow.id}&lang=English`);

      // Wait for CBT Arena to mount
      await expect(page.getByText("Q.1")).toBeVisible({ timeout: 30_000 });

      // Verify Marks in header: displays +2 and -0.66 (NOT +1 / -0.33!)
      await expect(page.getByText("+2")).toBeVisible();
      await expect(page.getByText("-0.66")).toBeVisible();

      // Verify BPSC "-0" grey badge is NOT present on this UPSC test
      await expect(page.locator("span").filter({ hasText: /^-0$/ })).toHaveCount(0);

      // Verify Section Tabs show authored section names ("General Studies" and "CSAT", NOT "Test"!)
      const generalStudiesTab = page.getByRole("button", { name: "General Studies" });
      const csatTab = page.getByRole("button", { name: "CSAT" });
      await expect(generalStudiesTab).toBeVisible();
      await expect(csatTab).toBeVisible();

      // Verify Question Palette section name shows authored title (NOT "SECTION : Test"!)
      if (isMobile) {
        // Open mobile palette
        await page.getByLabel("Open Question Palette").click();
        await expect(page.locator("div.fixed").getByText("SECTION : General Studies")).toBeVisible();
        // Verify BPSC "Not Selected" legend is NOT present
        await expect(page.locator("div.fixed").getByText("Not Selected")).toHaveCount(0);
        // Close palette
        await page.getByRole("button", { name: "Close" }).click();
      } else {
        await expect(page.locator("aside").getByText("SECTION : General Studies")).toBeVisible();
        // Verify BPSC "No option selected" legend is NOT present
        await expect(page.locator("aside").getByText("No option selected")).toHaveCount(0);
      }

      // Verify 5th option "Question Not Attempted" is NOT present on UPSC test
      await expect(page.getByText("Question Not Attempted")).toHaveCount(0);

      // Verify multi-line statement in question prompt preserves line breaks
      await expect(page.getByText("Consider the following statements regarding the Himalayas:")).toBeVisible();
      await expect(page.getByText("1. They are young fold mountains.")).toBeVisible();
      await expect(page.getByText("2. Mount Everest is located in the Greater Himalayas.")).toBeVisible();

      await takeStepScreenshot(page, `${testInfo.project.name}-04-student-cbt-arena-q1`);

      // Answer Q1: Select Option C ("Both 1 and 2")
      await page.getByText("Both 1 and 2").click();

      // Switch to Section 2: click "CSAT" tab
      await csatTab.click();

      // Verify marks updated to +2.5 / -0.83
      await expect(page.getByText("+2.5")).toBeVisible();
      await expect(page.getByText("-0.83")).toBeVisible();
      await expect(page.getByText("A train running at 54 km/hr")).toBeVisible();

      await takeStepScreenshot(page, `${testInfo.project.name}-05-student-cbt-arena-q2`);

      // Answer Q2: Select Option A ("200 meters")
      await page.getByText("200 meters").click();

      // Click Submit in CBT Arena header or action bar
      const submitBtn = page.getByTestId("cbt-submit-button").filter({ visible: true });
      await expect(submitBtn).toBeVisible({ timeout: 15_000 });
      await submitBtn.click();

      // Confirm submit dialog
      const confirmSubmitBtn = page.getByTestId("cbt-confirm-submit-button");
      await expect(confirmSubmitBtn).toBeVisible({ timeout: 10_000 });
      await confirmSubmitBtn.click();

      // ─────────────────────────────────────────────────────────────
      // STEP 3: Result Page & Solutions View
      // ─────────────────────────────────────────────────────────────
      await page.waitForURL((url) => url.pathname.endsWith("/result") && url.searchParams.has("attemptId"), { timeout: 30_000, waitUntil: "commit" });
      await expect(page.getByText("ALL INDIA RANK")).toBeVisible({ timeout: 30_000 });

      await takeStepScreenshot(page, `${testInfo.project.name}-06-student-result-page`);

      // Switch to Question-wise Review tab
      await page.getByRole("button", { name: /Question-wise Review/i }).click();

      // Open Solutions detail modal for Q1
      const viewSolutionsBtn = page.getByRole("button", { name: /View Solution/i }).first();
      await expect(viewSolutionsBtn).toBeVisible({ timeout: 15_000 });
      await viewSolutionsBtn.click();
      await expect(page.getByText("Detailed Solution & Explanation")).toBeVisible({ timeout: 10_000 });

        // Verify multi-line explanation in result preserves linebreaks
        const isSpeedExplanation = await page.getByText(/Speed = 54/i).isVisible().catch(() => false);
        if (isSpeedExplanation) {
          await expect(page.getByText("Speed = 54 * 5/18 = 15 m/s.")).toBeVisible();
          await expect(page.getByText("Train length = 300 - 100 = 200m.")).toBeVisible();
        } else {
          await expect(page.getByText("Both statements are correct.")).toBeVisible();
          await expect(page.getByText("1. The Himalayas are geologically young")).toBeVisible();
        }

        await takeStepScreenshot(page, `${testInfo.project.name}-07-student-solution-modal`);
    } finally {
      await cleanupNonce(nonce);
    }
  });

  test("BPSC test variant: 5th option 'Question Not Attempted', '-0' grey badge, and 'No option selected' legend DO appear", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const admin = await createActor(nonce, "ADMIN", "admin-bpsc");
    const student = await createActor(nonce, "FREE", "student-bpsc");

    const isMobile = (testInfo.project.name || "").includes("mobile");

    try {
      // 1. Seed BPSC Series and published test
      const seriesSlug = slugFor(`${nonce}-bpsc-70th`);
      const series = await prisma.examSeries.create({
        data: {
          title: `${nonce} 70th BPSC Integrated Mock Series`,
          slug: seriesSlug,
          examName: "70th BPSC Prelims",
          category: "BPSC",
          isPublished: true,
          isFree: true,
          createdById: admin.id,
        },
      });

      const testRow = await prisma.examTest.create({
        data: {
          seriesId: series.id,
          title: `${nonce} 70th BPSC Full Length Mock 1`,
          testType: "FULL_MOCK",
          accessMode: "FREE",
          durationMinutes: 120,
          totalQuestions: 1,
          totalMarks: 1,
          positiveMarks: 1,
          negativeMarks: 0.33,
          isPublished: true,
          createdById: admin.id,
          sections: {
            create: [
              {
                title: "General Studies",
                order: 1,
                positiveMarks: 1,
                negativeMarks: 0.33,
                questions: {
                  create: [
                    {
                      questionEn: "Which district of Bihar has the highest literacy rate according to 2011 Census?",
                      optionAEn: "Rohtas",
                      optionBEn: "Patna",
                      optionCEn: "Bhojpur",
                      optionDEn: "Munger",
                      correctOption: "A",
                      explanationEn: "According to the 2011 Census, Rohtas district has the highest literacy rate in Bihar (73.37%).",
                      positiveMarks: 1,
                      negativeMarks: 0.33,
                      order: 1,
                      subject: "Bihar Special",
                      questionType: "MCQ",
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      // Student attempts BPSC test
      await loginThroughUi(page, student.email);
      await page.goto(`/test-series/${series.slug}/attempt?testId=${testRow.id}&lang=English`);

      await expect(page.getByText("Q.1")).toBeVisible({ timeout: 30_000 });

      // 1. Verify BPSC "-0" grey marks badge IS visible in CBT header
      await expect(page.locator("span").filter({ hasText: /^-0$/ })).toBeVisible();

      // 2. Verify 5th option "Question Not Attempted" IS visible on BPSC test
      await expect(page.getByText("Question Not Attempted")).toBeVisible();

      // 3. Verify Question Palette has "No option selected" / "Not Selected"
      if (isMobile) {
        await page.getByLabel("Open Question Palette").click();
        await expect(page.locator("div.fixed").getByText("Not Selected")).toBeVisible();
        await page.getByRole("button", { name: "Close" }).click();
      } else {
        await expect(page.locator("aside").getByText("No option selected")).toBeVisible();
      }

      await takeStepScreenshot(page, `${testInfo.project.name}-08-bpsc-arena-with-bpsc-elements`);
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
