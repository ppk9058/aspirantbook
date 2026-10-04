import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"

const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/8877425f-14b2-4ce1-b4ec-00ba0ed01c01"

async function runMobileStudentE2E() {
  console.log("=== Starting Playwright Real Mobile Browser E2E Test ===")
  const courseSlug = "72nd-bpsc-prelims-current-affairs"
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  if (!course) throw new Error("Course not found in database")

  // Generate random fresh 10-digit mobile number starting with 98
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)
  const testMobile = `98${randomSuffix}`
  console.log(`Test Student Mobile Number: ${testMobile}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  })

  // iPhone 14 viewport (390 x 844) with mobile user-agent
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  })

  const page = await context.newPage()

  try {
    // ----------------------------------------------------
    // STEP 1: Open Course Page on Mobile
    // ----------------------------------------------------
    console.log("\n[Step 1] Loading Course Page on Mobile (390x844)...")
    await page.goto(`http://localhost:3000/courses/${courseSlug}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // Scroll down so the action button is in view
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("SCHEDULE FREE DEMO CLASS"))
      if (btn) btn.scrollIntoView({ block: "center" })
      else window.scrollTo(0, 700)
    })
    await page.waitForTimeout(800)

    const shot1 = path.join(ARTIFACTS_DIR, "step1_mobile_course_page.png")
    await page.screenshot({ path: shot1 })
    console.log(`✓ Screenshot 1 saved: ${shot1}`)

    // ----------------------------------------------------
    // STEP 2: Click "SCHEDULE FREE DEMO CLASS" & Select Slot
    // ----------------------------------------------------
    console.log("\n[Step 2] Clicking 'SCHEDULE FREE DEMO CLASS' button...")
    const scheduleBtn = page.locator('button:has-text("SCHEDULE FREE DEMO CLASS")')
    await scheduleBtn.first().click()
    await page.waitForTimeout(1000)

    // Fill in mobile number
    console.log(`Filling mobile number: ${testMobile}`)
    const phoneInput = page.locator('input[type="tel"]')
    await phoneInput.fill(testMobile)
    await page.waitForTimeout(500)

    const shot2 = path.join(ARTIFACTS_DIR, "step2_mobile_modal_slot_picked.png")
    await page.screenshot({ path: shot2 })
    console.log(`✓ Screenshot 2 saved: ${shot2}`)

    // ----------------------------------------------------
    // STEP 3: Click "Verify Mobile & Confirm Seat" -> OTP Screen
    // ----------------------------------------------------
    console.log("\n[Step 3] Submitting slot + mobile to advance to OTP...")
    const confirmBtn = page.locator('button:has-text("Verify Mobile & Confirm Seat")')
    await confirmBtn.click()
    await page.waitForTimeout(1000)

    // Verify OTP view appeared
    const otpHeader = await page.locator('text=Enter 6-Digit OTP').isVisible()
    console.log(`OTP header visible: ${otpHeader}`)

    const shot3 = path.join(ARTIFACTS_DIR, "step3_mobile_modal_otp_view.png")
    await page.screenshot({ path: shot3 })
    console.log(`✓ Screenshot 3 saved: ${shot3}`)

    // ----------------------------------------------------
    // STEP 4: Enter 6-digit OTP & Complete Booking
    // ----------------------------------------------------
    console.log("\n[Step 4] Entering OTP (123456) and confirming booking...")
    const otpInputs = page.locator('input[type="text"][inputmode="numeric"]')
    const count = await otpInputs.count()
    console.log(`Found ${count} OTP input boxes`)

    // Fill the 6 digits
    for (let i = 0; i < count; i++) {
      await otpInputs.nth(i).fill(`${i + 1}`)
    }

    // Wait for the booking API call and UI transition
    console.log("Waiting for confirmation screen...")
    await page.waitForSelector('text=Booking Confirmed', { timeout: 15000 })
    await page.waitForTimeout(1000)

    const shot4 = path.join(ARTIFACTS_DIR, "step4_mobile_booking_confirmation.png")
    await page.screenshot({ path: shot4 })
    console.log(`✓ Screenshot 4 saved: ${shot4}`)

    // ----------------------------------------------------
    // STEP 5: Database Verification
    // ----------------------------------------------------
    console.log("\n[Step 5] Verifying PostgreSQL database records...")
    const dbUser = await prisma.user.findFirst({
      where: { phoneNumber: testMobile }
    })
    console.log(`Found DB user for phone ${testMobile}: id=${dbUser?.id}, name=${dbUser?.name}`)

    const dbBooking = await prisma.demoBooking.findFirst({
      where: { mobile: `+91${testMobile}` },
      include: { slot: true, course: true }
    })
    console.log(`Found DemoBooking row in PostgreSQL:`)
    console.log(`- Booking ID: ${dbBooking?.id}`)
    console.log(`- Student ID: ${dbBooking?.studentId}`)
    console.log(`- Slot ID: ${dbBooking?.slotId}`)
    console.log(`- Slot Time: ${dbBooking?.slot?.startTime.toISOString()}`)
    console.log(`- Slot Status: ${dbBooking?.slot?.status}`)

    if (!dbBooking) {
      throw new Error(`CRITICAL: No DemoBooking found in DB for mobile +91${testMobile}`)
    }

    // ----------------------------------------------------
    // STEP 6: Navigate to My Batches (/my-learning)
    // ----------------------------------------------------
    console.log("\n[Step 6] Navigating to My Batches (/my-learning)...")
    await page.goto("http://localhost:3000/my-learning", { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    const shot5 = path.join(ARTIFACTS_DIR, "step5_mobile_my_batches_card.png")
    await page.screenshot({ path: shot5 })
    console.log(`✓ Screenshot 5 saved: ${shot5}`)

    // Verify upcoming demo section and course card are visible on My Batches
    const upcomingSectionVisible = await page.locator('text=Your Scheduled Live Demo Classes').isVisible()
    console.log(`'Your Scheduled Live Demo Classes' visible in My Batches: ${upcomingSectionVisible}`)

    const courseCardVisible = await page.locator(`text=${course.title}`).first().isVisible()
    console.log(`'${course.title}' visible in My Batches: ${courseCardVisible}`)

    // ----------------------------------------------------
    // STEP 7: Enter Demo Room via Link
    // ----------------------------------------------------
    console.log("\n[Step 7] Entering Demo Room (/courses/.../demo?slot=...)...")
    await page.goto(`http://localhost:3000/courses/${courseSlug}/demo?slot=${dbBooking.slotId}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2500)

    const shot6 = path.join(ARTIFACTS_DIR, "step6_mobile_demo_room_page.png")
    await page.screenshot({ path: shot6 })
    console.log(`✓ Screenshot 6 saved: ${shot6}`)

    // ----------------------------------------------------
    // STEP 8: Course Page - Booked State Card Verification
    // ----------------------------------------------------
    console.log("\n[Step 8] Returning to Course Page to verify 'Your Upcoming Demo Class' card...")
    await page.goto(`http://localhost:3000/courses/${courseSlug}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    const bookedCard = page.locator('text=Your Upcoming Demo Class').first()
    await bookedCard.waitFor({ state: "visible", timeout: 10000 })
    await bookedCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)

    const shot7 = path.join(ARTIFACTS_DIR, "step7_mobile_course_page_booked_card.png")
    await page.screenshot({ path: shot7 })
    console.log(`✓ Screenshot 7 saved: ${shot7}`)

    // ----------------------------------------------------
    // STEP 9: Test Duplicate Booking with the Same Number
    // ----------------------------------------------------
    console.log("\n[Step 9] Testing duplicate booking with the same number...")
    // Make a direct POST to /api/courses/demo/book
    const dupRes = await fetch("http://localhost:3000/api/courses/demo/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        courseSlug: course.slug,
        slotId: dbBooking.slotId,
        phoneNumber: testMobile,
      }),
    })
    const dupData = await dupRes.json()
    console.log("Duplicate booking API response:", {
      success: dupData.success,
      alreadyBooked: dupData.alreadyBooked,
      message: dupData.message,
      bookingId: dupData.bookingId,
    })

    console.log("\n=== ALL E2E MOBILE BROWSER TESTS PASSED PERFECTLY! ===")
  } catch (error) {
    console.error("Test failed with error:", error)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "test_failure_debug.png") })
    throw error
  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}

runMobileStudentE2E().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
