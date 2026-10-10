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

test.describe("Teacher creates series & test, guest catalogue reflects within one refresh", () => {
  test.beforeEach(async ({ context }) => beginArtifacts(context));
  test.afterEach(async ({ page, context }, testInfo) => saveArtifacts(page, context, testInfo));

  test("guest visits catalogue, teacher creates series and test, guest sees series on reload", async ({ browser }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-author");

    const seriesTitle = `${nonce} BPSC Sectional Test Series`;
    const seriesSlug = slugFor(seriesTitle);
    const testTitle = `${nonce} BPSC History Sectional Test1`;

    // 1. Guest visits /test-series with goal BPSC. This triggers /api/exam/series/list which gets cached in unstable_cache.
    const guestContext: BrowserContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const guestPage: Page = await guestContext.newPage();

    try {
      // Set guest goal to BPSC in localStorage before navigating
      await guestPage.addInitScript(() => {
        localStorage.setItem("trillion_selected_goal", "bpsc");
      });
      await guestPage.goto("/test-series", { waitUntil: "networkidle" });

      // Verify the new series does NOT exist yet in guest catalogue
      await expect(guestPage.getByText(seriesTitle)).toHaveCount(0);

      // 2. Teacher logs in in a separate context, creates series and publishes a test
      const teacherContext: BrowserContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const teacherPage: Page = await teacherContext.newPage();
      await loginThroughUi(teacherPage, teacher.email);

      // Teacher creates series via API
      const createSeriesRes = await teacherPage.request.post("/api/exam/series/create", {
        data: {
          title: seriesTitle,
          category: "BPSC",
          logoType: "bpsc",
          languages: "English, Hindi",
          highlights: ["Comprehensive BPSC Sectional Tests"],
          description: "BPSC Sectional Test Series for Prelims",
          isPublished: true,
          isPro: false,
        },
      });
      expect(createSeriesRes.status()).toBe(200);

      // Teacher creates and publishes test in this series
      const createTestRes = await teacherPage.request.post("/api/exam/test/create", {
        data: {
          seriesId: seriesSlug,
          title: testTitle,
          testType: "SECTIONAL",
          accessMode: "FREE",
          durationMinutes: 60,
          isPublished: true,
          sections: [
            {
              title: "History Section",
              positiveMarks: 1,
              negativeMarks: 0.33,
              questions: [
                {
                  questionEn: "Who was the leader of 1857 revolt in Bihar?",
                  optionAEn: "Kunwar Singh",
                  optionBEn: "Nana Saheb",
                  optionCEn: "Tantia Tope",
                  optionDEn: "Rani Laxmibai",
                  correctOption: "A",
                  explanationEn: "Veer Kunwar Singh led the 1857 revolt in Bihar.",
                  subject: "History",
                  difficulty: "MEDIUM",
                },
              ],
            },
          ],
        },
      });
      expect(createTestRes.status()).toBe(200);

      await teacherContext.close();

      // 3. Guest reloads /test-series ("within one refresh")
      await guestPage.reload({ waitUntil: "networkidle" });

      // Guest catalogue must now show the newly created series
      await expect(guestPage.getByRole("heading", { name: seriesTitle })).toBeVisible({ timeout: 10_000 });
    } finally {
      await guestContext.close();
      await cleanupNonce(nonce);
    }
  });
});
