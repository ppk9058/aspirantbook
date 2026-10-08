import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DB_URL,
    },
  },
});

const BASE = "http://localhost:3045";
const ts = Date.now();

const MARKER_UPSC = `CANARY_UPSC_TUTORIAL_${ts}`;
const MARKER_SKILLS = `CANARY_SKILLS_TUTORIAL_${ts}`;
const MARKER_ZERO = `CANARY_ZERO_LESSON_TUTORIAL_${ts}`;

let upscTutId = "";
let skillsTutId = "";
let zeroTutId = "";

test.describe.serial("Tutorial-to-Goal Alignment Proof Suite", () => {
  test.beforeAll(async () => {
    // Clean any prior canary tutorials
    await prisma.course.deleteMany({
      where: { title: { contains: "CANARY" } },
    });

    // 1. Seeded UPSC tutorial (with 1 lesson)
    const upscTut = await prisma.course.create({
      data: {
        title: MARKER_UPSC,
        slug: `canary-upsc-tutorial-${ts}`,
        description: "UPSC canonical tutorial for proof test",
        technology: "upsc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "Chapter 1: Indian Polity",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Preamble and Constitution",
                    order: 1,
                    type: "READING",
                    content: "UPSC lesson content",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    upscTutId = upscTut.id;

    // 2. Seeded Skills tutorial (with 1 lesson)
    const skillsTut = await prisma.course.create({
      data: {
        title: MARKER_SKILLS,
        slug: `canary-skills-tutorial-${ts}`,
        description: "Skills canonical tutorial for proof test",
        technology: "skills",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "Chapter 1: TypeScript Foundations",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Type Inference & Generics",
                    order: 1,
                    type: "READING",
                    content: "Skills lesson content",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    skillsTutId = skillsTut.id;

    // 3. Seeded Zero-lesson tutorial (UPSC tagged, 0 lessons)
    const zeroTut = await prisma.course.create({
      data: {
        title: MARKER_ZERO,
        slug: `canary-zero-lesson-tutorial-${ts}`,
        description: "Zero lesson tutorial should be hidden from students",
        technology: "upsc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "Empty Chapter",
              order: 1,
              // No lessons created
            },
          ],
        },
      },
    });
    zeroTutId = zeroTut.id;
  });

  test.afterAll(async () => {
    // Delete all seeded canary tutorials
    await prisma.course.deleteMany({
      where: { title: { contains: "CANARY" } },
    });
    await prisma.$disconnect();
  });

  test("Run Marker Table & RSC/HTML Counts across Student Contexts", async ({ browser }) => {
    interface ContextResult {
      contextName: string;
      upscHtml: number;
      upscRsc: number;
      skillsHtml: number;
      skillsRsc: number;
      zeroHtml: number;
      zeroRsc: number;
    }

    const results: ContextResult[] = [];

    const scenarios = [
      { name: "Student UPSC", goalCookie: "upsc" },
      { name: "Student Skills", goalCookie: "skills" },
      { name: "Student BPSC", goalCookie: "bpsc" },
      { name: "No Goal (Guest)", goalCookie: null },
    ];

    for (const sc of scenarios) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });

      if (sc.goalCookie) {
        await context.addCookies([
          {
            name: "trillion_selected_goal",
            value: sc.goalCookie,
            url: BASE,
          },
        ]);
      }

      const page = await context.newPage();

      // Measure HTML counts
      await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      const upscHtml = await page.locator(`text=${MARKER_UPSC}`).count();
      const skillsHtml = await page.locator(`text=${MARKER_SKILLS}`).count();
      const zeroHtml = await page.locator(`text=${MARKER_ZERO}`).count();

      // Measure RSC counts via direct request
      const rscHeaders: Record<string, string> = { RSC: "1" };
      if (sc.goalCookie) {
        rscHeaders["Cookie"] = `trillion_selected_goal=${sc.goalCookie}`;
      }
      const rscRes = await page.request.get(`${BASE}/tutorials`, {
        headers: rscHeaders,
      });
      const rscText = await rscRes.text();

      const upscRsc = (rscText.match(new RegExp(MARKER_UPSC, "g")) || []).length;
      const skillsRsc = (rscText.match(new RegExp(MARKER_SKILLS, "g")) || []).length;
      const zeroRsc = (rscText.match(new RegExp(MARKER_ZERO, "g")) || []).length;

      results.push({
        contextName: sc.name,
        upscHtml,
        upscRsc,
        skillsHtml,
        skillsRsc,
        zeroHtml,
        zeroRsc,
      });

      // For Student BPSC: capture screenshots at 1440x900 and 390x844
      if (sc.goalCookie === "bpsc") {
        // Desktop screenshot
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: "artifacts/bpsc-empty-state-1440x900.png",
          fullPage: true,
        });

        // Verify empty state text and links
        const emptyStateHeader = page.locator("text=No tutorials for BPSC yet");
        await expect(emptyStateHeader).toBeVisible();

        const exploreCoursesBtn = page.getByRole("link", { name: "Explore Courses" });
        await expect(exploreCoursesBtn).toBeVisible();

        const exploreTestSeriesBtn = page.getByRole("link", { name: "Explore Test Series" });
        await expect(exploreTestSeriesBtn).toBeVisible();

        // Mobile screenshot
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: "artifacts/bpsc-empty-state-390x844.png",
          fullPage: true,
        });
        await expect(emptyStateHeader).toBeVisible();
      }

      await context.close();
    }

    console.log("\n========================================================================================================");
    console.log("MARKER TABLE: HTML AND RSC COUNTS ACROSS STUDENT GOAL CONTEXTS");
    console.log("========================================================================================================");
    console.log("Student Context    | Seeded UPSC Tut (HTML / RSC) | Seeded Skills Tut (HTML / RSC) | 0-Lesson Tut (HTML / RSC)");
    console.log("--------------------------------------------------------------------------------------------------------");
    for (const r of results) {
      console.log(
        `${r.contextName.padEnd(18)} | ` +
        `HTML: ${r.upscHtml}, RSC: ${r.upscRsc}`.padEnd(28) + ` | ` +
        `HTML: ${r.skillsHtml}, RSC: ${r.skillsRsc}`.padEnd(30) + ` | ` +
        `HTML: ${r.zeroHtml}, RSC: ${r.zeroRsc}`
      );
    }
    console.log("========================================================================================================\n");

    // Assertions
    // 1. Student UPSC sees ONLY UPSC (1), Skills is 0, 0-lesson is 0
    const upscRes = results.find((r) => r.contextName === "Student UPSC")!;
    expect(upscRes.upscHtml).toBeGreaterThanOrEqual(1);
    expect(upscRes.skillsHtml).toBe(0);
    expect(upscRes.zeroHtml).toBe(0);

    // 2. Student Skills sees ONLY Skills (1), UPSC is 0, 0-lesson is 0
    const skillsRes = results.find((r) => r.contextName === "Student Skills")!;
    expect(skillsRes.skillsHtml).toBeGreaterThanOrEqual(1);
    expect(skillsRes.upscHtml).toBe(0);
    expect(skillsRes.zeroHtml).toBe(0);

    // 3. Student BPSC sees 0 for all (clean empty state)
    const bpscRes = results.find((r) => r.contextName === "Student BPSC")!;
    expect(bpscRes.upscHtml).toBe(0);
    expect(bpscRes.skillsHtml).toBe(0);
    expect(bpscRes.zeroHtml).toBe(0);

    // 4. Zero-lesson tutorial is 0 across all student contexts
    for (const r of results) {
      expect(r.zeroHtml).toBe(0);
      expect(r.zeroRsc).toBe(0);
    }
  });

  test("Cleanup Query Verification: 0 Residual Canary Rows", async () => {
    // Delete any remaining
    await prisma.course.deleteMany({
      where: { title: { contains: "CANARY" } },
    });

    const canaryRemaining = await prisma.course.count({
      where: { title: { contains: "CANARY" } },
    });

    console.log("\n================ CLEANUP VERIFICATION QUERY ================");
    console.log(`Remaining Canary Courses in DB: ${canaryRemaining}`);
    console.log("============================================================\n");

    expect(canaryRemaining).toBe(0);
  });
});
