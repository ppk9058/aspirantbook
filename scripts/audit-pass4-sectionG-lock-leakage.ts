import { prisma } from "../lib/prisma"
import { chromium } from "playwright"

async function run() {
  console.log("=== SECTION G: Lock Leakage Audit ===")

  // 1. Check DB for locked lesson info
  const course = await prisma.course.findUnique({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    include: {
      chapters: {
        include: {
          lessons: true,
        },
      },
    },
  })

  if (!course) throw new Error("Course not found")
  const lockedLessonWithVideo = course.chapters
    .flatMap((c) => c.lessons)
    .find((l) => !l.isTrial && l.videoUrl && l.videoUrl.length > 5)

  if (!lockedLessonWithVideo) throw new Error("No locked lesson with videoUrl found")
  console.log(`[db] Locked lesson: id=${lockedLessonWithVideo.id} title="${lockedLessonWithVideo.title}"`)
  console.log(`[db] Locked lesson videoUrl: ${lockedLessonWithVideo.videoUrl}`)

  // Extract video ID (e.g. YouTube ID)
  const lockedVideoUrl = lockedLessonWithVideo.videoUrl
  if (!lockedVideoUrl) throw new Error("Locked lesson fixture has no videoUrl")
  const ytMatch = lockedVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  const videoId = ytMatch ? ytMatch[1] : null
  console.log(`[db] Locked lesson YouTube video ID: ${videoId}`)

  // 2. Check anonymous request -> expect 307 to /login
  const anonRes = await fetch(`http://localhost:3000/courses/${course.slug}/learn/${lockedLessonWithVideo.id}`, {
    redirect: "manual",
  })
  console.log(`[anon] Anonymous request HTTP status: ${anonRes.status}`)
  console.log(`[anon] Anonymous redirect location: ${anonRes.headers.get("location")}`)

  // 3. Create fresh unpaid test user and login via browser to get real rendered HTML & RSC payload
  const rand = Math.floor(10000 + Math.random() * 90000)
  const phone = `99988${rand}`
  const testUser = await prisma.user.create({
    data: {
      email: `test_leak_${rand}@example.com`,
      phoneNumber: phone,
      name: `Leak Audit User ${rand}`,
      role: "FREE",
    },
  })
  console.log(`[setup] Created unpaid test user ${testUser.id.slice(0, 8)}`)

  let browser: any = null
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()

    // Login via mobile OTP
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
    await page.click('button:has-text("Continue with Mobile OTP")')
    await page.fill('input[placeholder="Enter 10-digit mobile number"]', phone)
    await page.click('button:has-text("Get OTP")')
    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

    const otpBoxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click()
      await otpBoxes.nth(i).press(`${i + 1}`)
      await page.waitForTimeout(50)
    }

    await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15000 })
    console.log("[auth] Logged in successfully")

    // Fetch the locked page URL as logged in user
    const targetUrl = `http://localhost:3000/courses/${course.slug}/learn/${lockedLessonWithVideo.id}`
    console.log(`[audit] Navigating to locked lesson: ${targetUrl}`)

    // Track network responses to capture raw HTML and RSC payload
    let pageHtmlResponse = ""
    let rscPayload = ""

    page.on("response", async (res: any) => {
      const url = res.url()
      if (url.includes(`/courses/${course.slug}/learn/${lockedLessonWithVideo.id}`)) {
        try {
          const text = await res.text()
          if (res.headers()["content-type"]?.includes("text/x-component")) {
            rscPayload += text
          } else if (res.headers()["content-type"]?.includes("text/html")) {
            pageHtmlResponse = text
          }
        } catch (e) {}
      }
    })

    await page.goto(targetUrl, { waitUntil: "networkidle" })
    const renderedHtml = await page.content()

    // 4. Audit checks for leakage
    console.log("\n--- LEAKAGE AUDIT RESULTS ---")
    
    // Check 1: videoUrl
    const urlMatchesHtml = renderedHtml.includes(lockedVideoUrl)
    const rawMatches = pageHtmlResponse.includes(lockedVideoUrl)
    console.log(`1. Exact videoUrl (${lockedLessonWithVideo.videoUrl}) in rendered DOM: ${urlMatchesHtml}`)
    console.log(`   Exact videoUrl in raw SSR HTML: ${rawMatches}`)

    // Check 2: videoId
    const idMatchesHtml = videoId ? renderedHtml.includes(videoId) : false
    const idMatchesRaw = videoId ? pageHtmlResponse.includes(videoId) : false
    console.log(`2. YouTube Video ID (${videoId}) in rendered DOM: ${idMatchesHtml}`)
    console.log(`   YouTube Video ID in raw SSR HTML: ${idMatchesRaw}`)

    // Check 3: Telegram link
    const telegramInDom = /t\.me\/[a-zA-Z0-9_+]+|telegram\.me\/[a-zA-Z0-9_+]+/i.test(renderedHtml)
    const telegramInRaw = /t\.me\/[a-zA-Z0-9_+]+|telegram\.me\/[a-zA-Z0-9_+]+/i.test(pageHtmlResponse)
    console.log(`3. Telegram invite link in rendered DOM: ${telegramInDom}`)
    console.log(`   Telegram invite link in raw SSR HTML: ${telegramInRaw}`)

    // Check 4: Check if video iframe or video tag is rendered for locked lesson
    const iframeExists = await page.locator("iframe#youtube-player-frame, iframe[src*='youtube']").count()
    console.log(`4. YouTube iframe element rendered on locked lesson: ${iframeExists > 0}`)

    // Check 5: Paywall overlay presence
    const overlayText = await page.locator("text=Premium Lesson, text=Enroll to unlock, text=Unlock full access").count()
    console.log(`5. Paywall overlay visible: ${overlayText > 0}`)

  } finally {
    if (browser) await browser.close()
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } })
      console.log(`[cleanup] Cleaned up test user ${testUser.id.slice(0, 8)}`)
    }
  }
}

run().catch((err) => {
  console.error("SECTION G FAILED:", err)
  process.exit(1)
})
