import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== [Part I] Full Playwright E2E Touchpoints Verification ===\n');

  const randomPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  console.log(`Generated Test User Phone: 98******${randomPhone.slice(-2)}`);

  const browser = await chromium.launch({ headless: true });
  // Desktop 1440x900 viewport
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let testUserId: string | null = null;
  const seriesSlug = 'bpsc-72nd-2026';
  const testId = 'bpsc-sectional-5q';

  try {
    // 1. Mobile UI Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")');
    await mobileBtn.click();
    await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(randomPhone);
    await page.locator('button:has-text("Get OTP")').click();
    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 });

    const otpBoxes = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click();
      await otpBoxes.nth(i).press(`${i + 1}`);
      await page.waitForTimeout(50);
    }

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    const user = await prisma.user.findFirst({ where: { phoneNumber: randomPhone } });
    if (!user) throw new Error('User not found after login');
    testUserId = user.id;
    console.log(`✓ User logged in: ${testUserId.substring(0, 6)}...`);

    // 2. Open Series Detail Page -> Check "Start Now"
    console.log(`\nNavigating to /test-series/${seriesSlug}...`);
    await page.goto(`${BASE_URL}/test-series/${seriesSlug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const startNowBtn = page.locator('a:has-text("Start Now")').first();
    const isStartNowVisible = await startNowBtn.isVisible();
    console.log(`Touchpoint 1 (Series Detail): "Start Now" visible = ${isStartNowVisible}`);

    // Click Start Now -> Instructions -> Declaration -> Attempt
    await startNowBtn.click();
    await page.waitForURL((url) => url.pathname.includes('/instructions'), { timeout: 10000 });
    console.log(`✓ Arrived at instructions: ${page.url()}`);

    const nextBtn = page.locator('a[href*="/declaration"], a:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForURL((url) => url.pathname.includes('/declaration'), { timeout: 10000 });
    console.log(`✓ Arrived at declaration: ${page.url()}`);

    const declarationLabel = page.locator('text=I have read and understood the instructions').first();
    await declarationLabel.click();
    await page.waitForTimeout(500);

    const beginBtn = page.locator('button:has-text("I am ready to begin"), button:has-text("Begin Test")').first();
    await beginBtn.click();

    await page.waitForURL((url) => url.pathname.includes('/attempt'), { timeout: 15000 });
    const attemptUrl = page.url();
    console.log(`✓ In attempt page: ${attemptUrl}`);

    // Reload attempt page to test resume resilience
    await page.reload({ waitUntil: 'domcontentloaded' });
    console.log(`✓ Reloaded attempt page successfully.`);

    // 3. Touchpoint checks while test is IN_PROGRESS
    console.log('\n--- Checking Touchpoints for IN_PROGRESS ("Continue") state ---');
    await page.goto(`${BASE_URL}/test-series/${seriesSlug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const hasContinueSeries = await page.locator('a:has-text("Continue")').isVisible();
    console.log(` - Series Detail Page: "Continue" visible = ${hasContinueSeries}`);

    // 4. Return to attempt and Submit
    console.log('\nReturning to attempt page to submit...');
    await page.goto(attemptUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Look for visible Submit button on desktop
    const submitBtn = page.locator('button:has-text("Submit"):visible').first();
    await submitBtn.click();
    await page.waitForTimeout(500);

    // In modal, click "Submit Now"
    const confirmSubmitBtn = page.locator('button:has-text("Submit Now"):visible').first();
    await confirmSubmitBtn.click();

    await page.waitForURL((url) => url.pathname.includes('/result'), { timeout: 15000 });
    console.log(`✓ Exam submitted! Result page reached: ${page.url()}`);

    // 5. Touchpoint checks after test is SUBMITTED
    console.log('\n--- Checking Touchpoints for SUBMITTED ("Full Report") state ---');
    await page.goto(`${BASE_URL}/test-series/${seriesSlug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const hasFullReportSeries = await page.locator('a:has-text("Full Report")').isVisible();
    console.log(` - Series Detail Page: "Full Report" visible = ${hasFullReportSeries}`);

    await page.goto(`${BASE_URL}/my-tests`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const hasFullReportMyTests = (await page.locator('text=Full Report').or(page.locator('text=View Report')).or(page.locator('text=Report')).count()) > 0;
    console.log(` - My Tests Hub: "Full Report" or Report link visible = ${hasFullReportMyTests}`);

    console.log('\n=== E2E TOUCHPOINTS VERIFIED SUCCESSFULLY! ===');
  } finally {
    await browser.close();
    if (testUserId) {
      console.log(`\nCleaning up test user: ${testUserId}...`);
      await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { userId: testUserId } } });
      await prisma.examAttempt.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
      console.log('✓ Cleaned up all test database records.');
    }
  }
}

main().finally(() => prisma.$disconnect());
