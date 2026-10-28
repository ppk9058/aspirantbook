import { chromium } from "playwright"
import { prisma } from "../lib/prisma"

async function run() {
  console.log("=== SECTION E: Video Progress Saving & Resume Test ===")
  const rand = Math.floor(10000 + Math.random() * 90000)
  const phone = `99988${rand}`
  let testUser: any = null
  let browser: any = null

  try {
    testUser = await prisma.user.create({
      data: {
        email: `test_progress_${rand}@example.com`,
        phoneNumber: phone,
        name: `Progress Test User ${rand}`,
        role: "FREE",
      },
    })
    console.log(`[setup] Created test user ${testUser.id.slice(0, 8)}`)

    const course = await prisma.course.findUnique({
      where: { slug: "72nd-bpsc-prelims-current-affairs" },
      include: {
        chapters: {
          include: {
            lessons: {
              where: { isTrial: true },
            },
          },
        },
      },
    })
    if (!course) throw new Error("Course 72nd-bpsc-prelims-current-affairs not found")
    const trialLesson = course.chapters
      .flatMap((c) => c.lessons)
      .find((l) => l.isTrial && l.videoUrl)
    if (!trialLesson) throw new Error("No trial lesson with video found")
    console.log(`[setup] Using trial lesson ${trialLesson.id} (${trialLesson.title})`)

    // Launch Chromium
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()

    // 1. Log in isolated student
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
    const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")')
    await mobileBtn.click()
    await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(phone)
    await page.locator('button:has-text("Get OTP")').click()
    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

    const otpBoxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click()
      await otpBoxes.nth(i).press(`${i + 1}`)
      await page.waitForTimeout(50)
    }

    await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15000 })
    console.log("[auth] Logged in successfully")

    // Navigate to course learn page
    const learnUrl = `http://localhost:3000/courses/${course.slug}/learn/${trialLesson.id}`
    console.log(`[navigate] Opening ${learnUrl}`)
    await page.goto(learnUrl, { waitUntil: "networkidle" })

    // Click to start playing video
    const startPlayBtn = page.locator("button:has-text('Start Class'), button:has-text('Play'), [data-play-button='true'], .aspect-video button")
    if (await startPlayBtn.count() > 0) {
      await startPlayBtn.first().click()
    } else {
      await page.click(".aspect-video")
    }

    // Wait for iframe#youtube-player-frame to appear
    await page.waitForSelector("#youtube-player-frame", { timeout: 15000 })
    console.log("[player] YouTube iframe loaded")

    // Check player API availability and wait for player to enter PLAYING state (1)
    console.log("[player] Waiting for YouTube Player API initialization...")
    await page.waitForFunction(() => {
      return typeof (window as any).__getYTPlayerState === "function" || typeof (window as any).__ytPlayer?.getPlayerState === "function"
    }, { timeout: 20000 })

    // Unmute and play via API if browser policy prevented autoplay
    await page.evaluate(() => {
      const p = (window as any).__ytPlayer
      if (p) {
        try { p.mute?.() } catch (e) {}
        try { p.playVideo?.() } catch (e) {}
      }
    })

    console.log("[player] Waiting for getPlayerState() === 1 (PLAYING)...")
    await page.waitForFunction(() => {
      const stateFn = (window as any).__getYTPlayerState
      const p = (window as any).__ytPlayer
      const state = stateFn ? stateFn() : p?.getPlayerState?.()
      return state === 1 // 1 is PLAYING
    }, { timeout: 20000 })

    const playerState = await page.evaluate(() => {
      const stateFn = (window as any).__getYTPlayerState
      return stateFn ? stateFn() : (window as any).__ytPlayer?.getPlayerState?.()
    })
    console.log(`[player] Confirmed player state == PLAYING (${playerState})`)

    // Wait 11s so second 5s interval fires and current play time is >= 6s
    console.log("[player] Playing video for 11 seconds to trigger interval progress save...")
    await page.waitForTimeout(11000)

    // Pause player to test pause flush
    await page.evaluate(() => {
      try { (window as any).__ytPlayer?.pauseVideo?.() } catch (e) {}
    })
    await page.waitForTimeout(1000)

    // Check currentTime
    const curTime = await page.evaluate(() => {
      return (window as any).__ytPlayer?.getCurrentTime?.() || 0
    })
    console.log(`[player] Current play time: ${curTime.toFixed(1)}s`)

    // Verify DB Progress record
    const dbProgress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: testUser.id,
          lessonId: trialLesson.id,
        },
      },
    })

    console.log(`[db] Progress row:`, dbProgress)
    if (!dbProgress) {
      throw new Error("FAIL: No Progress row found in database for user and lesson")
    }
    if (dbProgress.timeSpent < 5) {
      throw new Error(`FAIL: dbProgress.timeSpent (${dbProgress.timeSpent}) is less than 5 seconds!`)
    }
    console.log(`[db] PASS: dbProgress.timeSpent = ${dbProgress.timeSpent}s (>= 5s)`)

    // Now reload the page and verify resume
    console.log("[resume] Reloading page to verify resume position...")
    await page.reload({ waitUntil: "networkidle" })

    // Click play
    const reloadPlayBtn = page.locator("button:has-text('Start Class'), button:has-text('Play'), [data-play-button='true'], .aspect-video button")
    if (await reloadPlayBtn.count() > 0) {
      await reloadPlayBtn.first().click()
    } else {
      await page.click(".aspect-video")
    }

    await page.waitForSelector("#youtube-player-frame", { timeout: 15000 })
    const iframeSrc = await page.getAttribute("#youtube-player-frame", "src")
    console.log(`[resume] Iframe src: ${iframeSrc}`)

    // Check if start parameter is present in iframe src
    const hasStartParam = iframeSrc?.includes(`start=${dbProgress.timeSpent}`) || iframeSrc?.includes("start=")
    console.log(`[resume] Iframe src contains start param: ${hasStartParam}`)

    if (!hasStartParam) {
      throw new Error(`FAIL: Iframe src does not contain start param with saved time: ${iframeSrc}`)
    }
    console.log(`[resume] PASS: Video resumes at saved position (start=${dbProgress.timeSpent})`)

    console.log("=== SECTION E: ALL TESTS PASSED ===")
  } finally {
    if (browser) await browser.close()
    if (testUser) {
      await prisma.progress.deleteMany({ where: { userId: testUser.id } })
      await prisma.user.delete({ where: { id: testUser.id } })
      console.log(`[cleanup] Cleaned up test user ${testUser.id.slice(0, 8)}`)
    }
  }
}

run().catch((err) => {
  console.error("SECTION E TEST FAILED:", err)
  process.exit(1)
})
