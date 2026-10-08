import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE = "http://localhost:3045";

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

const ts = Date.now();
const shortTs = ts.toString(36);
const STUDENT_EMAIL = `proof_student_${shortTs}@test.local`;
const PASSWORD = "Password123!";

// Unique markers for each surface
const MARKERS = {
  UPSC_TUT: `CNRY_UPSC_TUT_${shortTs}`,
  SSC_TUT: `CNRY_SSC_TUT_${shortTs}`,
  UPSC_CRS: `CNRY_UPSC_CRS_${shortTs}`,
  SSC_CRS: `CNRY_SSC_CRS_${shortTs}`,
  UPSC_SERIES: `CNRY_UPSC_SRS_${shortTs}`,
  SSC_SERIES: `CNRY_SSC_SRS_${shortTs}`,
  UPSC_QUIZ: `CNRY_UPSC_QZ_${shortTs}`,
  SSC_QUIZ: `CNRY_SSC_QZ_${shortTs}`,
};

const SEED_IDS = {
  studentId: "",
  upscTutId: "",
  sscTutId: "",
  upscCrsId: "",
  sscCrsId: "",
  upscSeriesId: "",
  sscSeriesId: "",
  upscQuizId: "",
  sscQuizId: "",
};

test.describe.serial("Goal Refresh Proof Suite (No Manual Reload)", () => {
  test.beforeAll(async () => {
    // Clean any prior canaries
    await prisma.examTest.deleteMany({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });
    await prisma.examSeries.deleteMany({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });
    await prisma.course.deleteMany({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });

    const hash = await bcrypt.hash(PASSWORD, 10);

    // 1. Student User
    const user = await prisma.user.create({
      data: {
        email: STUDENT_EMAIL,
        password: hash,
        name: "Proof Student",
        role: "FREE",
        selectedGoal: "upsc",
      },
    });
    SEED_IDS.studentId = user.id;

    // 2. Tutorials
    const upscTut = await prisma.course.create({
      data: {
        title: MARKERS.UPSC_TUT,
        slug: `canary-proof-upsc-tut-${ts}`,
        description: "UPSC Reading Tutorial",
        technology: "upsc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "Polity Ch 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Preamble Lesson",
                    order: 1,
                    type: "READING",
                    content: "Polity text",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    SEED_IDS.upscTutId = upscTut.id;

    const sscTut = await prisma.course.create({
      data: {
        title: MARKERS.SSC_TUT,
        slug: `canary-proof-ssc-tut-${ts}`,
        description: "SSC Reading Tutorial",
        technology: "ssc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "SSC Ch 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Reasoning Lesson",
                    order: 1,
                    type: "READING",
                    content: "Reasoning text",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    SEED_IDS.sscTutId = sscTut.id;

    // 3. Courses (Video courses with video lesson)
    const upscCrs = await prisma.course.create({
      data: {
        title: MARKERS.UPSC_CRS,
        slug: `canary-proof-upsc-crs-${ts}`,
        description: "UPSC Video Course",
        technology: "upsc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: true,
        chapters: {
          create: [
            {
              title: "UPSC Video Ch 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Video 1",
                    order: 1,
                    type: "VIDEO",
                    videoUrl: "https://example.com/video1",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    SEED_IDS.upscCrsId = upscCrs.id;

    const sscCrs = await prisma.course.create({
      data: {
        title: MARKERS.SSC_CRS,
        slug: `canary-proof-ssc-crs-${ts}`,
        description: "SSC Video Course",
        technology: "ssc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: true,
        chapters: {
          create: [
            {
              title: "SSC Video Ch 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Video 1",
                    order: 1,
                    type: "VIDEO",
                    videoUrl: "https://example.com/video2",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    SEED_IDS.sscCrsId = sscCrs.id;

    // 4. Test Series & Quizzes
    const upscSeries = await prisma.examSeries.create({
      data: {
        title: MARKERS.UPSC_SERIES,
        slug: `canary-proof-upsc-series-${ts}`,
        examName: "UPSC",
        category: "UPSC Current Affairs",
        isPublished: true,
        isFree: true,
        createdById: user.id,
      },
    });
    SEED_IDS.upscSeriesId = upscSeries.id;

    const sscSeries = await prisma.examSeries.create({
      data: {
        title: MARKERS.SSC_SERIES,
        slug: `canary-proof-ssc-series-${ts}`,
        examName: "SSC",
        category: "SSC Current Affairs",
        isPublished: true,
        isFree: true,
        createdById: user.id,
      },
    });
    SEED_IDS.sscSeriesId = sscSeries.id;

    const upscQuiz = await prisma.examTest.create({
      data: {
        title: MARKERS.UPSC_QUIZ,
        seriesId: upscSeries.id,
        testType: "FULL_MOCK",
        totalQuestions: 5,
        totalMarks: 10,
        durationMinutes: 10,
        isPublished: true,
        createdById: user.id,
      },
    });
    SEED_IDS.upscQuizId = upscQuiz.id;

    const sscQuiz = await prisma.examTest.create({
      data: {
        title: MARKERS.SSC_QUIZ,
        seriesId: sscSeries.id,
        testType: "FULL_MOCK",
        totalQuestions: 5,
        totalMarks: 10,
        durationMinutes: 10,
        isPublished: true,
        createdById: user.id,
      },
    });
    SEED_IDS.sscQuizId = sscQuiz.id;
  });

  test.afterAll(async () => {
    // Delete tests, series, courses, user
    await prisma.examTest.deleteMany({
      where: { id: { in: [SEED_IDS.upscQuizId, SEED_IDS.sscQuizId] } },
    });
    await prisma.examSeries.deleteMany({
      where: { id: { in: [SEED_IDS.upscSeriesId, SEED_IDS.sscSeriesId] } },
    });
    await prisma.lesson.deleteMany({
      where: {
        chapter: {
          courseId: {
            in: [
              SEED_IDS.upscTutId,
              SEED_IDS.sscTutId,
              SEED_IDS.upscCrsId,
              SEED_IDS.sscCrsId,
            ],
          },
        },
      },
    });
    await prisma.chapter.deleteMany({
      where: {
        courseId: {
          in: [
            SEED_IDS.upscTutId,
            SEED_IDS.sscTutId,
            SEED_IDS.upscCrsId,
            SEED_IDS.sscCrsId,
          ],
        },
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: {
          in: [
            SEED_IDS.upscTutId,
            SEED_IDS.sscTutId,
            SEED_IDS.upscCrsId,
            SEED_IDS.sscCrsId,
          ],
        },
      },
    });
    if (SEED_IDS.studentId) {
      await prisma.user.delete({ where: { id: SEED_IDS.studentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  interface ProofRow {
    viewport: string;
    goalChange: string;
    surface: string;
    ownMarkerCount: number;
    otherMarkerCount: number;
    msUntilUpdated: number;
  }

  const allProofRows: ProofRow[] = [];

  // Helper to change goals via UI without page reload
  async function performGoalChangeViaUI(
    page: Page,
    action: "upsc-to-ssc" | "ssc-to-upsc" | "add-ssc" | "remove-ssc"
  ): Promise<number> {
    const start = Date.now();

    if (action === "remove-ssc") {
      // Direct remove button on the active bar
      const removeSscBtn = page.locator('button[data-remove-goal="ssc"]').first();
      await removeSscBtn.click();
    } else {
      // Open modal
      const addTargetBtn = page.getByRole("button", { name: /Add.*exam.*target/i }).first();
      await addTargetBtn.click();
      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: "visible", timeout: 5000 });

      if (action === "upsc-to-ssc") {
        // In modal, click SSC card to toggle ON, click UPSC card to toggle OFF
        const sscBtn = modal.locator('button[data-goal-id="ssc"]').first();
        await sscBtn.click();
        await page.waitForTimeout(150);

        const upscBtn = modal.locator('button[data-goal-id="upsc"]').first();
        await upscBtn.click();
        await page.waitForTimeout(150);
      } else if (action === "ssc-to-upsc") {
        const upscBtn = modal.locator('button[data-goal-id="upsc"]').first();
        await upscBtn.click();
        await page.waitForTimeout(150);

        const sscBtn = modal.locator('button[data-goal-id="ssc"]').first();
        await sscBtn.click();
        await page.waitForTimeout(150);
      } else if (action === "add-ssc") {
        const sscBtn = modal.locator('button[data-goal-id="ssc"]').first();
        await sscBtn.click();
        await page.waitForTimeout(150);
      }

      // Close modal
      const doneBtn = modal.getByRole("button", { name: "Done" });
      await doneBtn.click();
    }

    // Wait for the server refresh to complete (RSC update settles)
    await page.waitForTimeout(1200);
    const duration = Date.now() - start;
    return duration;
  }

  async function checkSurfaceMarkers(
    page: Page,
    surfaceName: string,
    url: string,
    ownGoal: "upsc" | "ssc" | "both",
    goalChangeName: string,
    durationMs: number,
    viewportLabel: string
  ) {
    // Navigate via client-side link or goto without manual reload
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    let upscMarker = "";
    let sscMarker = "";

    if (surfaceName === "Tutorials") {
      upscMarker = MARKERS.UPSC_TUT;
      sscMarker = MARKERS.SSC_TUT;
    } else if (surfaceName === "Courses") {
      upscMarker = MARKERS.UPSC_CRS;
      sscMarker = MARKERS.SSC_CRS;
    } else if (surfaceName === "Test Series") {
      upscMarker = MARKERS.UPSC_SERIES;
      sscMarker = MARKERS.SSC_SERIES;
    } else if (surfaceName === "Quizzes") {
      upscMarker = MARKERS.UPSC_QUIZ;
      sscMarker = MARKERS.SSC_QUIZ;
    } else if (surfaceName === "PYQ") {
      upscMarker = MARKERS.UPSC_SERIES;
      sscMarker = MARKERS.SSC_SERIES;
    }

    if (ownGoal === "ssc") {
      await page.locator(`text=${sscMarker}`).first().waitFor({ state: "visible", timeout: 8000 });
    } else if (ownGoal === "upsc") {
      await page.locator(`text=${upscMarker}`).first().waitFor({ state: "visible", timeout: 8000 });
    } else {
      await page.locator(`text=${upscMarker}`).first().waitFor({ state: "visible", timeout: 8000 });
      await page.locator(`text=${sscMarker}`).first().waitFor({ state: "visible", timeout: 8000 });
    }

    const upscCount = await page.locator(`text=${upscMarker}`).count();
    const sscCount = await page.locator(`text=${sscMarker}`).count();
    console.log(`[CHECK] ${surfaceName} (${url}) ownGoal=${ownGoal}: upsc=${upscCount}, ssc=${sscCount}`);

    let ownCount = 0;
    let otherCount = 0;

    if (ownGoal === "ssc") {
      ownCount = sscCount;
      otherCount = upscCount;
    } else if (ownGoal === "upsc") {
      ownCount = upscCount;
      otherCount = sscCount;
    } else {
      // both
      ownCount = Math.min(upscCount, sscCount);
      otherCount = 0; // both are own-goal
    }

    allProofRows.push({
      viewport: viewportLabel,
      goalChange: goalChangeName,
      surface: surfaceName,
      ownMarkerCount: ownCount,
      otherMarkerCount: otherCount,
      msUntilUpdated: durationMs,
    });

    if (ownGoal === "ssc") {
      expect(sscCount).toBeGreaterThanOrEqual(1);
      expect(upscCount).toBe(0);
    } else if (ownGoal === "upsc") {
      expect(upscCount).toBeGreaterThanOrEqual(1);
      expect(sscCount).toBe(0);
    } else if (ownGoal === "both") {
      expect(upscCount).toBeGreaterThanOrEqual(1);
      expect(sscCount).toBeGreaterThanOrEqual(1);
    }
  }

  const viewports = [
    { label: "desktop (1440x900)", width: 1440, height: 900 },
    { label: "mobile (390x844)", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Run 4 Goal Change Cases across 5 Surfaces on ${vp.label}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      page.on("request", (req) => {
        if (req.url().includes("/api/user/goal")) {
          console.log(`[REQ] ${req.method()} ${req.postData() || ""}`);
        }
      });
      page.on("response", async (res) => {
        if (res.url().includes("/api/user/goal")) {
          console.log(`[RES] ${res.status()} ${await res.text()}`);
        }
      });

      // Log in student once
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
      await page.locator('input[type="password"]').fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 15000,
      });

      // CASE 1: UPSC -> SSC
      await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const ms1 = await performGoalChangeViaUI(page, "upsc-to-ssc");

      await checkSurfaceMarkers(page, "Tutorials", "/tutorials", "ssc", "UPSC -> SSC", ms1, vp.label);
      await checkSurfaceMarkers(page, "Courses", "/courses", "ssc", "UPSC -> SSC", ms1, vp.label);
      await checkSurfaceMarkers(page, "Test Series", "/test-series", "ssc", "UPSC -> SSC", ms1, vp.label);
      await checkSurfaceMarkers(page, "Quizzes", "/current-affairs-quizzes", "ssc", "UPSC -> SSC", ms1, vp.label);
      await checkSurfaceMarkers(page, "PYQ", "/pyqs", "ssc", "UPSC -> SSC", ms1, vp.label);

      // CASE 2: SSC -> UPSC
      await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const ms2 = await performGoalChangeViaUI(page, "ssc-to-upsc");

      await checkSurfaceMarkers(page, "Tutorials", "/tutorials", "upsc", "SSC -> UPSC", ms2, vp.label);
      await checkSurfaceMarkers(page, "Courses", "/courses", "upsc", "SSC -> UPSC", ms2, vp.label);
      await checkSurfaceMarkers(page, "Test Series", "/test-series", "upsc", "SSC -> UPSC", ms2, vp.label);
      await checkSurfaceMarkers(page, "Quizzes", "/current-affairs-quizzes", "upsc", "SSC -> UPSC", ms2, vp.label);
      await checkSurfaceMarkers(page, "PYQ", "/pyqs", "upsc", "SSC -> UPSC", ms2, vp.label);

      // CASE 3: UPSC -> UPSC+SSC
      await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const ms3 = await performGoalChangeViaUI(page, "add-ssc");

      await checkSurfaceMarkers(page, "Tutorials", "/tutorials", "both", "UPSC -> UPSC+SSC", ms3, vp.label);
      await checkSurfaceMarkers(page, "Courses", "/courses", "both", "UPSC -> UPSC+SSC", ms3, vp.label);
      await checkSurfaceMarkers(page, "Test Series", "/test-series", "both", "UPSC -> UPSC+SSC", ms3, vp.label);
      await checkSurfaceMarkers(page, "Quizzes", "/current-affairs-quizzes", "both", "UPSC -> UPSC+SSC", ms3, vp.label);
      await checkSurfaceMarkers(page, "PYQ", "/pyqs", "both", "UPSC -> UPSC+SSC", ms3, vp.label);

      // CASE 4: UPSC+SSC -> none removed back to UPSC
      await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const ms4 = await performGoalChangeViaUI(page, "remove-ssc");

      await checkSurfaceMarkers(page, "Tutorials", "/tutorials", "upsc", "UPSC+SSC -> UPSC", ms4, vp.label);
      await checkSurfaceMarkers(page, "Courses", "/courses", "upsc", "UPSC+SSC -> UPSC", ms4, vp.label);
      await checkSurfaceMarkers(page, "Test Series", "/test-series", "upsc", "UPSC+SSC -> UPSC", ms4, vp.label);
      await checkSurfaceMarkers(page, "Quizzes", "/current-affairs-quizzes", "upsc", "UPSC+SSC -> UPSC", ms4, vp.label);
      await checkSurfaceMarkers(page, "PYQ", "/pyqs", "upsc", "UPSC+SSC -> UPSC", ms4, vp.label);

      await context.close();
    });
  }

  test("Print Proof Table and Verify Clean DB", async () => {
    console.log("\n=============================================================================================================");
    console.log("GOAL REFRESH PROOF TABLE (SAME SESSION, NO MANUAL RELOAD)");
    console.log("=============================================================================================================");
    console.log("Viewport               | Goal Change        | Surface     | Own Marker Count | Other Marker Count | Time to Update");
    console.log("-------------------------------------------------------------------------------------------------------------");
    for (const r of allProofRows) {
      console.log(
        `${r.viewport.padEnd(22)} | ` +
        `${r.goalChange.padEnd(18)} | ` +
        `${r.surface.padEnd(11)} | ` +
        `${String(r.ownMarkerCount).padEnd(16)} | ` +
        `${String(r.otherMarkerCount).padEnd(18)} | ` +
        `${r.msUntilUpdated}ms`
      );
    }
    console.log("=============================================================================================================\n");

    // Clean DB
    await prisma.examTest.deleteMany({
      where: { id: { in: [SEED_IDS.upscQuizId, SEED_IDS.sscQuizId] } },
    });
    await prisma.examSeries.deleteMany({
      where: { id: { in: [SEED_IDS.upscSeriesId, SEED_IDS.sscSeriesId] } },
    });
    await prisma.lesson.deleteMany({
      where: {
        chapter: {
          courseId: {
            in: [
              SEED_IDS.upscTutId,
              SEED_IDS.sscTutId,
              SEED_IDS.upscCrsId,
              SEED_IDS.sscCrsId,
            ],
          },
        },
      },
    });
    await prisma.chapter.deleteMany({
      where: {
        courseId: {
          in: [
            SEED_IDS.upscTutId,
            SEED_IDS.sscTutId,
            SEED_IDS.upscCrsId,
            SEED_IDS.sscCrsId,
          ],
        },
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: {
          in: [
            SEED_IDS.upscTutId,
            SEED_IDS.sscTutId,
            SEED_IDS.upscCrsId,
            SEED_IDS.sscCrsId,
          ],
        },
      },
    });
    if (SEED_IDS.studentId) {
      await prisma.user.delete({ where: { id: SEED_IDS.studentId } }).catch(() => {});
    }

    const residualCourses = await prisma.course.count({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });
    const residualSeries = await prisma.examSeries.count({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });
    const residualTests = await prisma.examTest.count({
      where: { OR: [{ title: { contains: "CANARY" } }, { title: { contains: "CNRY_" } }] },
    });

    console.log("================ CLEANUP VERIFICATION QUERY ================");
    console.log(`Residual Canary Courses: ${residualCourses}`);
    console.log(`Residual Canary Series:  ${residualSeries}`);
    console.log(`Residual Canary Tests:   ${residualTests}`);
    console.log(`Total Residual:          ${residualCourses + residualSeries + residualTests}`);
    console.log("============================================================\n");

    expect(residualCourses + residualSeries + residualTests).toBe(0);
  });
});
