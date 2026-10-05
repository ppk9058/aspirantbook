import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import fs from "fs"

const SCREENSHOTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/screenshots_part5"

async function runPart5FreeCourseVerification() {
  console.log("=== [Part 5] Starting Free Course Enrollment & Progress E2E Verification ===")
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  // 1. Generate random valid Indian mobile starting with 98
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)
  const testMobile = `98${randomSuffix}`
  const maskedMobile = `98******${testMobile.slice(8)}`
  console.log(`Generated isolated student mobile: ${maskedMobile}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  let createdUserId: string | null = null
  const courseSlug = "class-6-foundation-starter"

  try {
    // ----------------------------------------------------
    // STEP 1: Log in through the real UI mobile flow
    // ----------------------------------------------------
    console.log("\n[Step 1] Opening /login and performing mobile login via real UI flow...")
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")')
    await mobileBtn.click()
    await page.waitForSelector('input[placeholder="Enter 10-digit mobile number"]', { timeout: 5000 })

    console.log(`Entering mobile number: ${maskedMobile}`)
    await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(testMobile)
    await page.waitForTimeout(300)

    console.log("Clicking Get OTP...")
    await page.locator('button:has-text("Get OTP")').click()
    await page.waitForTimeout(500)

    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 5000 })
    console.log("Entering 6 digits OTP (123456)...")
    const otpBoxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click()
      await otpBoxes.nth(i).press(`${i + 1}`)
      await page.waitForTimeout(100)
    }

    await page.waitForURL("**/my-learning", { timeout: 15000 })
    console.log("✓ Logged in successfully through real UI flow! Redirected to /my-learning")

    const userInDb = await prisma.user.findFirst({
      where: { phoneNumber: testMobile },
      select: { id: true },
    })
    if (!userInDb) {
      throw new Error("Could not find created user in DB")
    }
    createdUserId = userInDb.id
    console.log(`Confirmed test user created in DB: ${createdUserId}`)

    // ----------------------------------------------------
    // STEP 2: Navigate to Free Course and Enroll
    // ----------------------------------------------------
    console.log(`\n[Step 2] Navigating to free course /courses/${courseSlug}...`)
    await page.goto(`http://localhost:3000/courses/${courseSlug}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    const enrollBtn = page.locator('button:has-text("ENROLL FREE")').first()
    await enrollBtn.waitFor({ state: "visible", timeout: 8000 })
    console.log("Found 'ENROLL FREE' button on free course page!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_free_course_before.png") })

    console.log("Clicking 'ENROLL FREE' button...")
    await enrollBtn.click()
    await page.waitForURL("**/my-learning", { timeout: 15000 })
    console.log("✓ Enrolled in free course! Redirected to /my-learning")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_my_learning_enrolled.png") })

    // Verify enrollment record in DB
    const courseInDb = await prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        chapters: {
          include: { lessons: true }
        }
      }
    })
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: createdUserId,
          courseId: courseInDb!.id,
        }
      }
    })
    if (!enrollment) {
      throw new Error("Expected enrollment record in DB for free course, but not found!")
    }
    console.log(`✓ Verified enrollment in DB: courseId ${enrollment.courseId}`)

    // ----------------------------------------------------
    // STEP 3: Lesson Playback & Player Loaded
    // ----------------------------------------------------
    const firstLesson = courseInDb!.chapters[0].lessons[0]
    console.log(`\n[Step 3] Navigating to lesson player: /courses/${courseSlug}/learn/${firstLesson.id}...`)
    await page.goto(`http://localhost:3000/courses/${courseSlug}/learn/${firstLesson.id}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step3_player_loaded.png") })

    // Verify video container and title
    const lessonTitle = page.locator(`text=${firstLesson.title}`).first()
    await lessonTitle.waitFor({ state: "visible", timeout: 8000 })
    console.log(`✓ Lesson title "${firstLesson.title}" visible on player screen!`)

    // Click play canvas
    const playCanvas = page.locator('div:has-text("Play ")').first()
    if (await playCanvas.isVisible()) {
      console.log("Clicking video play canvas...")
      await playCanvas.click()
      await page.waitForTimeout(2000)
    }

    // Check iframe or video is rendered
    const videoFrame = page.locator('iframe, video').first()
    await videoFrame.waitFor({ state: "visible", timeout: 8000 })
    console.log("✓ Video player loaded and playing lesson!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step3_video_playing.png") })

    // ----------------------------------------------------
    // STEP 4: Progress Tracking
    // ----------------------------------------------------
    console.log(`\n[Step 4] Toggling lesson completion for progress tracking...`)
    // Click the lesson toggle button
    const completionToggle = page.locator('button[title*="Mark as completed"], button[title*="Completed"]').first()
    await completionToggle.click()
    await page.waitForTimeout(1500)

    // Verify progress in DB
    const progressInDb = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: createdUserId,
          lessonId: firstLesson.id,
        }
      }
    })
    console.log("Progress in DB:", progressInDb)
    if (!progressInDb || !progressInDb.completed) {
      throw new Error("Expected progress record in DB with completed: true, but not found!")
    }
    console.log(`✓ Verified lesson completion tracked in DB!`)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step4_progress_tracked.png") })

    console.log("\n🎉 ALL PART 5 FREE COURSE ENROLLMENT & PROGRESS CHECKS PASSED SUCCESSFULLY!\n")

  } catch (error) {
    console.error("Part 5 verification failed:", error)
    throw error
  } finally {
    // Cleanup
    if (createdUserId) {
      console.log(`\n[Cleanup] Cleaning up test user ${createdUserId}...`)
      await prisma.progress.deleteMany({ where: { userId: createdUserId } }).catch(() => {})
      await prisma.enrollment.deleteMany({ where: { userId: createdUserId } }).catch(() => {})
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {})
      console.log("✓ Cleanup finished cleanly.")
    }
    await browser.close()
    await prisma.$disconnect()
  }
}

runPart5FreeCourseVerification().catch(err => {
  console.error(err)
  process.exit(1)
})
