import { PrismaClient } from '@prisma/client';
import { chromium, BrowserContext, Page } from 'playwright';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function performLogin(page: Page, phone: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")');
  await mobileBtn.click();
  await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(phone);
  await page.locator('button:has-text("Get OTP")').click();
  await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 });

  const otpBoxes = page.locator('input[inputmode="numeric"]');
  for (let i = 0; i < 6; i++) {
    await otpBoxes.nth(i).click();
    await otpBoxes.nth(i).press(`${i + 1}`);
    await page.waitForTimeout(50);
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function main() {
  console.log('=== PART C: NEGATIVE CHECKS (COMPREHENSIVE RUN) ===\n');

  const course = await prisma.course.findUnique({
    where: { slug: '72nd-bpsc-prelims-current-affairs' },
    include: {
      chapters: {
        include: {
          lessons: true
        }
      }
    }
  });

  if (!course) throw new Error('Course not found');
  const lockedLesson = course.chapters.flatMap(ch => ch.lessons).find(l => !l.isTrial);
  if (!lockedLesson) throw new Error('Locked lesson not found');

  console.log(`Course: ${course.title} (₹${course.price})`);
  console.log(`Locked lesson under test: ${lockedLesson.title} (${lockedLesson.id})`);

  // 1. Anonymous direct page access
  console.log('\n--- 1. Anonymous Direct Page Access ---');
  const anonPageRes = await fetch(`${BASE_URL}/courses/${course.slug}/learn/${lockedLesson.id}`, {
    redirect: 'manual'
  });
  console.log(`HTTP Status: ${anonPageRes.status} (Location: ${anonPageRes.headers.get('location')})`);

  const browser = await chromium.launch({ headless: true });

  // 2. Logged-in student WITHOUT purchase
  console.log('\n--- 2. Logged-in Student Without Purchase ---');
  const nonPayingContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const nonPayingPage = await nonPayingContext.newPage();
  const nonPayingPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);

  await performLogin(nonPayingPage, nonPayingPhone);

  const nonPayingUser = await prisma.user.findFirst({
    where: { phoneNumber: nonPayingPhone }
  });
  console.log(`Logged in non-paying student: ID ${nonPayingUser?.id ? nonPayingUser.id.substring(0, 6) + '...' : 'null'}`);

  // Try opening locked lesson in player
  await nonPayingPage.goto(`${BASE_URL}/courses/${course.slug}/learn/${lockedLesson.id}`, { waitUntil: 'networkidle' });
  const nonPayingPaywall = await nonPayingPage.locator('text=PAID LESSON').isVisible();
  const nonPayingUnlockBtn = await nonPayingPage.locator('text=Unlock Full Course').isVisible();
  const nonPayingVideoElement = await nonPayingPage.locator('video, iframe').isVisible();
  console.log(`Non-paying Student: Paywall badge visible: ${nonPayingPaywall}`);
  console.log(`Non-paying Student: "Unlock Full Course" CTA visible: ${nonPayingUnlockBtn}`);
  console.log(`Non-paying Student: Video/iframe playable: ${nonPayingVideoElement}`);

  // 3. Alternative enrollment route bypass checks
  console.log('\n--- 3. Alternative Enrollment Route Tampering Checks ---');
  const cookies = await nonPayingContext.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const routes = [
    { name: 'Direct Enroll Route', url: `${BASE_URL}/api/courses/enroll`, method: 'POST', body: { courseId: course.id } },
    { name: 'Demo Complete Route', url: `${BASE_URL}/api/courses/demo/complete`, method: 'POST', body: { courseId: course.id } },
    { name: 'Tampered Razorpay Verify', url: `${BASE_URL}/api/verify-payment/razorpay`, method: 'POST', body: { razorpay_order_id: 'fake_order', razorpay_payment_id: 'fake_pay', razorpay_signature: 'fake_sig' } },
  ];

  for (const r of routes) {
    const res = await fetch(r.url, {
      method: r.method,
      headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
      body: JSON.stringify(r.body)
    });
    const resBody = await res.json().catch(() => ({}));
    console.log(`[${r.name}] ${r.method} ${r.url.replace(BASE_URL, '')} -> Status: ${res.status}, Body: ${JSON.stringify(resBody)}`);
  }

  // Verify non-paying student STILL has 0 enrollments
  const enrollmentCheck = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: nonPayingUser!.id,
        courseId: course.id
      }
    }
  });
  console.log(`Non-paying user enrollment in DB: ${enrollmentCheck ? 'EXISTS (LEAK!)' : 'NONE (SECURE)'}`);

  // 4. Paid student access persistence after logout and login
  console.log('\n--- 4. Paid Student Access Persistence After Logout & Login ---');
  const paidPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const paidContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const paidPage = await paidContext.newPage();

  await performLogin(paidPage, paidPhone);

  const paidUser = await prisma.user.findFirst({
    where: { phoneNumber: paidPhone }
  });
  console.log(`Created paid test user: ID ${paidUser?.id ? paidUser.id.substring(0, 6) + '...' : 'null'}`);

  // Create real DB enrollment for paidUser
  await prisma.enrollment.create({
    data: {
      userId: paidUser!.id,
      courseId: course.id
    }
  });
  console.log(`Created verified Enrollment row for paid user in DB`);

  // Navigate to locked lesson
  await paidPage.goto(`${BASE_URL}/courses/${course.slug}/learn/${lockedLesson.id}`, { waitUntil: 'networkidle' });
  const paidPaywallBeforeLogout = await paidPage.locator('text=PAID LESSON').isVisible();
  console.log(`Paid user BEFORE logout: Paywall visible: ${paidPaywallBeforeLogout} (Expected false)`);

  // Logout by clearing cookies
  await paidContext.clearCookies();
  await paidPage.goto(`${BASE_URL}/courses/${course.slug}/learn/${lockedLesson.id}`, { waitUntil: 'networkidle' });
  const loggedOutPaywall = await paidPage.locator('text=PAID LESSON').isVisible();
  console.log(`After clearing cookies: Paywall visible: ${loggedOutPaywall} (Expected true)`);

  // Log back in
  await performLogin(paidPage, paidPhone);

  // Navigate back to locked lesson
  await paidPage.goto(`${BASE_URL}/courses/${course.slug}/learn/${lockedLesson.id}`, { waitUntil: 'networkidle' });
  const paidPaywallAfterReLogin = await paidPage.locator('text=PAID LESSON').isVisible();
  console.log(`Paid user AFTER re-login: Paywall visible: ${paidPaywallAfterReLogin} (Expected false - Unlocked!)`);

  await browser.close();

  // Cleanup test users
  if (nonPayingUser) {
    await prisma.enrollment.deleteMany({ where: { userId: nonPayingUser.id } });
    await prisma.user.delete({ where: { id: nonPayingUser.id } });
  }
  if (paidUser) {
    await prisma.enrollment.deleteMany({ where: { userId: paidUser.id } });
    await prisma.user.delete({ where: { id: paidUser.id } });
  }
  console.log('\nCleaned up all test rows and users cleanly.');
}

main().finally(() => prisma.$disconnect());
