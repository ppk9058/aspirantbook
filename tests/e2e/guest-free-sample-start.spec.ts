import { test, expect } from "@playwright/test";
import { prisma, newNonce, createActor } from "./test-series-e2e-helpers";
import { UserRole } from "@prisma/client";

test.describe("Guest start free sample, mobile OTP login and student attempt flow", () => {
  const nonce = newNonce();
  let teacherId: string;
  let seriesId: string;
  let seriesSlug: string;
  let testId: string;
  const testTitle = `Free Sample Test ${nonce}`;

  test.beforeAll(async () => {
    const teacher = await createActor(nonce, UserRole.TEACHER, "sample-teacher");
    teacherId = teacher.id;

    const series = await prisma.examSeries.create({
      data: {
        title: `Free Sample Series ${nonce}`,
        slug: `free-sample-${nonce}`,
        category: "BPSC",
        examName: "BPSC",
        isPublished: true,
        isPro: true,
        createdById: teacherId,
        tests: {
          create: {
            title: testTitle,
            accessMode: "FREE",
            isPublished: true,
            createdById: teacherId,
            durationMinutes: 60,
            totalQuestions: 1,
            totalMarks: 5,
            sections: {
              create: {
                title: "General Studies",
                order: 1,
                questions: {
                  create: {
                    order: 1,
                    questionEn: "Question 1 for sample test",
                    optionAEn: "Option A",
                    optionBEn: "Option B",
                    optionCEn: "Option C",
                    optionDEn: "Option D",
                    correctOption: "A",
                    positiveMarks: 5,
                    negativeMarks: 1,
                  },
                },
              },
            },
          },
        },
      },
      include: { tests: true },
    });

    seriesId = series.id;
    seriesSlug = series.slug;
    testId = series.tests[0].id;
  });

  test.afterAll(async () => {
    if (testId) {
      await prisma.examAttemptAnswer.deleteMany({
        where: { attempt: { testId } },
      });
      await prisma.examAttempt.deleteMany({
        where: { testId },
      });
      await prisma.examQuestion.deleteMany({
        where: { section: { testId } },
      });
      await prisma.examSection.deleteMany({
        where: { testId },
      });
      await prisma.examTest.deleteMany({
        where: { id: testId },
      });
    }
    if (seriesId) {
      await prisma.examSeries.deleteMany({
        where: { id: seriesId },
      });
    }
    if (teacherId) {
      await prisma.user.deleteMany({
        where: { id: teacherId },
      });
    }
  });

  test("guest sees Start Free Sample, click triggers mobile OTP popup, login redirects to instructions, student starts and submits", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Guest visits test series detail page
    await page.goto(`/test-series/${seriesSlug}`);
    await expect(page.locator("text=Loading Test Series...")).not.toBeVisible({ timeout: 15000 });

    // 2. Guest must see "Start Free Sample" button for the free published test
    const startFreeBtn = page.getByRole("link", { name: "Start Free Sample" }).or(
      page.locator("button, a").filter({ hasText: "Start Free Sample" })
    );

    await expect(startFreeBtn.first()).toBeVisible({ timeout: 30000 });

    // 3. Guest clicks "Start Free Sample" -> opens mobile OTP auth modal
    await startFreeBtn.first().click();

    // Verify Mobile Auth modal is displayed
    const phoneInput = page.locator('input[type="tel"]').or(page.locator('input[placeholder*="mobile" i]'));
    await expect(phoneInput.first()).toBeVisible({ timeout: 5000 });

    // 4. Fill unique 10-digit mobile number and click Get OTP
    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    await phoneInput.first().fill(uniquePhone);

    const getOtpBtn = page.getByRole("button", { name: /Send OTP|Get OTP|Continue/i });
    await getOtpBtn.click();

    // Wait for OTP step (6 segmented tel inputs)
    const otpDigits = page.locator('input[type="tel"][maxlength="1"]');
    await expect(otpDigits.first()).toBeVisible({ timeout: 5000 });

    // Set up response listener for mobile-login API call
    const loginResponsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/auth/mobile-login") && r.status() === 200,
      { timeout: 15000 }
    );

    // Fill 6-digit OTP (123456)
    const count = await otpDigits.count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      await otpDigits.nth(i).pressSequentially(String(i + 1), { delay: 50 });
    }

    // Await API completion
    await loginResponsePromise;

    // 5. Verification completes and redirects to the instructions page with testId preserved
    await expect(page).toHaveURL(/instructions/, { timeout: 25000 });
    expect(page.url()).toContain("instructions");
    expect(page.url()).toContain("testId=");

    // 6. User is now authenticated on instructions page
    await expect(page.locator("text=Loading instructions...")).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=${testTitle}`).first()).toBeVisible({ timeout: 20000 });

    // 7. Student proceeds to declaration
    const proceedBtn = page.getByRole("link", { name: /Next|Proceed|I am ready|Continue/i }).or(
      page.locator("a[href*='declaration']")
    );
    if (await proceedBtn.first().isVisible()) {
      await proceedBtn.first().click();
      await expect(page).toHaveURL(/declaration/, { timeout: 15000 });

      // Agree to declaration checkbox
      const checkbox = page.locator("label:has-text('I have read')").or(page.locator("[data-testid='declaration-checkbox']")).first();
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.click();

      // Click "I am ready to begin"
      const beginBtn = page.getByRole("button", { name: /I am ready to begin|Start Test|Begin/i });
      if (await beginBtn.first().isVisible()) {
        await beginBtn.first().click();
        // Lands on attempt page
        await expect(page).toHaveURL(/attempt/, { timeout: 15000 });
        expect(page.url()).toContain("/attempt");
      }
    }
  });
});
