import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

const ts = Date.now();
const STUDENT_EMAIL = `repro_student_${ts}@test.local`;
const PASSWORD = "Password123!";
const MARKER_UPSC = `CANARY_REPRO_UPSC_${ts}`;
const MARKER_SSC = `CANARY_REPRO_SSC_${ts}`;

let studentId = "";
let upscTutId = "";
let sscTutId = "";

test.describe.serial("Reproduce Goal Change Stale List Bug", () => {
  test.beforeAll(async () => {
    // 1. Create Student A with UPSC goal
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: STUDENT_EMAIL,
        password: hash,
        name: "Repro Student",
        role: "FREE",
        selectedGoal: "upsc",
      },
    });
    studentId = user.id;

    // 2. Create UPSC tutorial
    const upscTut = await prisma.course.create({
      data: {
        title: MARKER_UPSC,
        slug: `canary-repro-upsc-${ts}`,
        description: "UPSC tutorial for reproduction test",
        technology: "upsc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "UPSC Chapter",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "UPSC Lesson",
                    order: 1,
                    type: "READING",
                    content: "Polity content",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    upscTutId = upscTut.id;

    // 3. Create SSC tutorial
    const sscTut = await prisma.course.create({
      data: {
        title: MARKER_SSC,
        slug: `canary-repro-ssc-${ts}`,
        description: "SSC tutorial for reproduction test",
        technology: "ssc",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "SSC Chapter",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "SSC Lesson",
                    order: 1,
                    type: "READING",
                    content: "Reasoning content",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    sscTutId = sscTut.id;
  });

  test.afterAll(async () => {
    await prisma.lesson.deleteMany({
      where: { chapter: { courseId: { in: [upscTutId, sscTutId] } } },
    });
    await prisma.chapter.deleteMany({
      where: { courseId: { in: [upscTutId, sscTutId] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [upscTutId, sscTutId] } },
    });
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test("Step 1 Repro: changing goal UPSC -> SSC without reload vs with reload", async ({
    page,
  }) => {
    // 1. Log in as student
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    page.on("request", (req) => {
      if (req.url().includes("/api/user/goal")) {
        console.log(`[REQ] ${req.method()} ${req.url()} ${req.postData() || ""}`);
      }
    });
    page.on("response", async (res) => {
      if (res.url().includes("/api/user/goal")) {
        console.log(`[RES] ${res.status()} ${await res.text()}`);
      }
    });

    // 2. Open /tutorials
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const initialUpscCount = await page.locator(`text=${MARKER_UPSC}`).count();
    const initialSscCount = await page.locator(`text=${MARKER_SSC}`).count();

    console.log("\n=======================================================");
    console.log("INITIAL STATE (Goal: UPSC):");
    console.log(`UPSC Marker Count: ${initialUpscCount}`);
    console.log(`SSC Marker Count:  ${initialSscCount}`);
    console.log("=======================================================");

    expect(initialUpscCount).toBeGreaterThanOrEqual(1);
    expect(initialSscCount).toBe(0);

    // 3. Open Goal Modal via GoalSelectorBar "+ Add exam target"
    const addExamBtn = page.getByRole("button", { name: /Add.*exam.*target/i });
    await addExamBtn.click();
    await page.waitForSelector('text=Select Target', { timeout: 5000 });

    // In modal, click "SSC" to add SSC and click "UPSC" to remove UPSC
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: "visible", timeout: 5000 });

    const sscModalBtn = modal.locator('button').filter({ hasText: "SSC" }).first();
    await sscModalBtn.click();
    await page.waitForTimeout(300);

    const upscModalBtn = modal.locator('button').filter({ hasText: "UPSC" }).first();
    await upscModalBtn.click();
    await page.waitForTimeout(300);

    // Click "Done"
    const doneBtn = modal.getByRole("button", { name: "Done" });
    await doneBtn.click();
    await page.waitForTimeout(2000); // Give time for any background fetch/state

    // 4. Read markers RIGHT AFTER CHANGE (NO RELOAD)
    const afterChangeUpscCount = await page.locator(`text=${MARKER_UPSC}`).count();
    const afterChangeSscCount = await page.locator(`text=${MARKER_SSC}`).count();

    console.log("\n=======================================================");
    console.log("RIGHT AFTER GOAL CHANGE TO SSC (NO RELOAD):");
    console.log(`UPSC Marker Count: ${afterChangeUpscCount} (expected 0 if updated, >0 if STALE BUG)`);
    console.log(`SSC Marker Count:  ${afterChangeSscCount} (expected >=1 if updated, 0 if STALE BUG)`);
    console.log("=======================================================");

    const dbUserAfterChange = await prisma.user.findUnique({ where: { id: studentId } });
    console.log(`DB selectedGoal right after change: ${dbUserAfterChange?.selectedGoal}`);

    // 5. Read markers AFTER MANUAL RELOAD
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const dbUserAfterReload = await prisma.user.findUnique({ where: { id: studentId } });
    console.log(`DB selectedGoal after reload: ${dbUserAfterReload?.selectedGoal}`);

    const afterReloadUpscCount = await page.locator(`text=${MARKER_UPSC}`).count();
    const afterReloadSscCount = await page.locator(`text=${MARKER_SSC}`).count();

    console.log("\n=======================================================");
    console.log("AFTER MANUAL RELOAD (Goal: SSC):");
    console.log(`UPSC Marker Count: ${afterReloadUpscCount}`);
    console.log(`SSC Marker Count:  ${afterReloadSscCount}`);
    console.log("=======================================================\n");
  });
});
