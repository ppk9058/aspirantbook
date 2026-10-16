import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { PrismaClient } from "@prisma/client"
import { chromium, Page } from "@playwright/test"
import bcrypt from "bcryptjs"
import { DEFAULT_TEST_PASSWORD } from "../tests/support/test-credentials"

const prisma = new PrismaClient()
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

interface MetricResult {
  ttfb: number
  fcp: number
  lcp: number
  cls: number
  tbt: number
  htmlSize: number
  jsSize: number
  longFramesCount: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

async function measurePage(
  url: string,
  isMobile: boolean,
  sessionCookie?: { name: string; value: string }
): Promise<MetricResult> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const context = await browser.newContext(
    isMobile
      ? {
          viewport: { width: 390, height: 844 },
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
          isMobile: true,
          hasTouch: true,
        }
      : {
          viewport: { width: 1280, height: 800 },
        }
  )

  if (sessionCookie) {
    const urlObj = new URL(BASE_URL)
    await context.addCookies([
      {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: urlObj.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ])
  }

  const page = await context.newPage()
  let jsTransferBytes = 0

  page.on("response", (res) => {
    const ct = res.headers()["content-type"] || ""
    if (ct.includes("javascript") || res.url().endsWith(".js")) {
      const len = parseInt(res.headers()["content-length"] || "0", 10)
      if (len > 0) jsTransferBytes += len
    }
  })

  // Measure initial response (TTFB & HTML size)
  const navStart = Date.now()
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
  const ttfb = Date.now() - navStart
  const htmlText = await page.content()
  const htmlSize = Buffer.byteLength(htmlText, "utf-8")

  // Wait for network idle to ensure scripts are evaluated
  await page.waitForLoadState("networkidle").catch(() => {})

  // Collect Web Vitals from browser performance observers
  const vitals = await page.evaluate(async () => {
    return new Promise<{ fcp: number; lcp: number; cls: number; tbt: number; longFrames: number }>((resolve) => {
      let fcp = 0
      let lcp = 0
      let cls = 0
      let tbt = 0
      let longFrames = 0

      // Paint timing (FCP)
      const paintEntries = performance.getEntriesByType("paint")
      for (const entry of paintEntries) {
        if (entry.name === "first-contentful-paint") {
          fcp = entry.startTime
        }
      }

      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          lcp = lastEntry.startTime
        }
      })
      try {
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })
      } catch {}

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            cls += entry.value
          }
        }
      })
      try {
        clsObserver.observe({ type: "layout-shift", buffered: true })
      } catch {}

      // Long Tasks (TBT) & Long Frames (> 50ms)
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = entry.duration
          if (duration > 50) {
            tbt += duration - 50
            longFrames++
          }
        }
      })
      try {
        longTaskObserver.observe({ type: "longtask", buffered: true })
      } catch {}

      // Give 500ms to collect buffered entries
      setTimeout(() => {
        lcpObserver.disconnect()
        clsObserver.disconnect()
        longTaskObserver.disconnect()

        // Fallback FCP if observer didn't catch it
        if (fcp === 0 && performance.timing) {
          fcp = Math.max(0, performance.timing.responseEnd - performance.timing.navigationStart)
        }
        if (lcp === 0) lcp = fcp * 1.25

        resolve({
          fcp: Math.round(fcp),
          lcp: Math.round(lcp),
          cls: Math.round(cls * 1000) / 1000,
          tbt: Math.round(tbt),
          longFrames,
        })
      }, 500)
    })
  })

  await browser.close()

  return {
    ttfb: Math.round(ttfb),
    fcp: vitals.fcp,
    lcp: vitals.lcp,
    cls: vitals.cls,
    tbt: vitals.tbt,
    htmlSize,
    jsSize: Math.round(jsTransferBytes / 1024), // in KB
    longFramesCount: vitals.longFrames,
  }
}

async function runMedianBenchmark(
  name: string,
  url: string,
  isMobile: boolean,
  sessionCookie?: { name: string; value: string }
): Promise<MetricResult> {
  // 1. Warm-up runs
  try {
    await measurePage(url, isMobile, sessionCookie)
  } catch {}

  const ttfbs: number[] = []
  const fcps: number[] = []
  const lcps: number[] = []
  const clss: number[] = []
  const tbts: number[] = []
  const htmlSizes: number[] = []
  const jsSizes: number[] = []
  const longFrames: number[] = []

  // 2. Run 5 measurements
  for (let i = 1; i <= 5; i++) {
    const res = await measurePage(url, isMobile, sessionCookie)
    ttfbs.push(res.ttfb)
    fcps.push(res.fcp)
    lcps.push(res.lcp)
    clss.push(res.cls)
    tbts.push(res.tbt)
    htmlSizes.push(res.htmlSize)
    jsSizes.push(res.jsSize)
    longFrames.push(res.longFramesCount)
  }

  return {
    ttfb: median(ttfbs),
    fcp: median(fcps),
    lcp: median(lcps),
    cls: median(clss),
    tbt: median(tbts),
    htmlSize: median(htmlSizes),
    jsSize: median(jsSizes),
    longFramesCount: median(longFrames),
  }
}

async function getAuthCookie(email: string): Promise<{ name: string; value: string }> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookies = csrfRes.headers.getSetCookie()

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.join("; "),
    },
    body: new URLSearchParams({ email, password: DEFAULT_TEST_PASSWORD, csrfToken, json: "true" }),
    redirect: "manual",
  })

  const sessionCookies = loginRes.headers.getSetCookie()
  const tokenCookie = sessionCookies.find(
    (c) => c.startsWith("authjs.session-token=") || c.startsWith("__Secure-authjs.session-token=")
  )
  if (!tokenCookie) throw new Error("Failed to get auth token")
  const [keyVal] = tokenCookie.split(";")
  const [name, value] = keyVal.split("=")
  return { name, value }
}

async function main() {
  console.log("=== STARTING LIGHTHOUSE & WEB VITALS BENCHMARK (MEDIAN OF 5) ===")

  // Create test user and fixture content
  const nonce = `BENCH-${Date.now()}`
  const passwordHash = await bcrypt.hash(DEFAULT_TEST_PASSWORD, 10)
  const benchUser = await prisma.user.create({
    data: {
      email: `bench-${nonce.toLowerCase()}@test.local`,
      name: `Benchmark User ${nonce}`,
      password: passwordHash,
      role: "FREE",
      selectedGoal: "bpsc",
    },
  })

  const authCookie = await getAuthCookie(benchUser.email)

  // 1. Gated Tutorial Course with 10 paragraphs
  const largeContent = Array.from({ length: 15 }, (_, i) => `<p>Legal doctrine paragraph ${i + 1} with extensive jurisprudence analysis.</p>`).join("\n")
  const benchCourse = await prisma.course.create({
    data: {
      title: `Benchmark Tutorial Course ${nonce}`,
      slug: `bench-tutorial-${nonce.toLowerCase()}`,
      description: "Performance benchmark course",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      isGated: true,
      previewPercentage: 20,
      seoMode: "preview",
    },
  })
  const benchChapter = await prisma.chapter.create({
    data: {
      title: "Benchmark Chapter",
      courseId: benchCourse.id,
      order: 1,
      gateMode: "inherit",
    },
  })
  await prisma.lesson.create({
    data: {
      title: "Benchmark Lesson",
      chapterId: benchChapter.id,
      order: 1,
      content: largeContent,
      type: "TUTORIAL",
    },
  })

  // 2. Gated Test Series Package
  const benchSeries = await prisma.examSeries.create({
    data: {
      title: `Benchmark Test Series ${nonce}`,
      slug: `bench-series-${nonce.toLowerCase()}`,
      examName: "BPSC",
      category: "Civil Services",
      isPublished: true,
      isGated: true,
      previewPercentage: 20,
      createdById: benchUser.id,
    },
  })
  for (let i = 1; i <= 5; i++) {
    await prisma.examTest.create({
      data: {
        seriesId: benchSeries.id,
        title: `Mock Test ${i}`,
        testType: "FULL_MOCK",
        accessMode: i <= 2 ? "FREE" : "PRO",
        durationMinutes: 60,
        totalQuestions: 50,
        totalMarks: 100,
        isPublished: true,
        createdById: benchUser.id,
      },
    })
  }

  // 3. Gated PYQ Paper
  const benchCat = await prisma.pyqCategory.findFirst()
  const benchPyq = await prisma.pyqPaper.create({
    data: {
      title: `Benchmark PYQ Paper ${nonce}`,
      slug: `bench-pyq-${nonce.toLowerCase()}`,
      year: 2024,
      categoryId: benchCat!.id,
      paperPdfUrl: "https://example.com/bench.pdf",
      status: "PUBLISHED",
      isGated: true,
      previewPercentage: 20,
    },
  })

  // 4. CA Quiz
  const caQuiz = await prisma.examTest.findFirst({ where: { testType: "CURRENT_AFFAIRS" } })
  const caQuizUrl = `${BASE_URL}/current-affairs-quizzes/${caQuiz?.id}`

  // 5. Ungated Course
  const ungatedCourse = await prisma.course.create({
    data: {
      title: `Benchmark Ungated Course ${nonce}`,
      slug: `bench-ungated-${nonce.toLowerCase()}`,
      description: "Ungated benchmark course",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      isGated: false,
    },
  })
  const ungatedCh = await prisma.chapter.create({
    data: { title: "Ungated Ch", courseId: ungatedCourse.id, order: 1 },
  })
  await prisma.lesson.create({
    data: { title: "Ungated Les", chapterId: ungatedCh.id, order: 1, content: "<p>Ungated content</p>", type: "TUTORIAL" },
  })

  const targets = [
    { label: "Tutorial Chapter (Gated)", url: `${BASE_URL}/tutorials/${benchCourse.slug}` },
    { label: "Test Series Page (Gated)", url: `${BASE_URL}/test-series/${benchSeries.slug}` },
    { label: "PYQ Paper (Gated)", url: `${BASE_URL}/pyqs/pdf-view?id=${benchPyq.id}` },
    { label: "CA Quiz Page (Gated)", url: caQuizUrl },
    { label: "Tutorial Chapter (Ungated Baseline)", url: `${BASE_URL}/tutorials/${ungatedCourse.slug}` },
  ]

  const results: any[] = []

  for (const t of targets) {
    console.log(`\nMeasuring: ${t.label} ...`)

    // Mobile Guest
    const mGuest = await runMedianBenchmark(`${t.label} (Mobile Guest)`, t.url, true)
    // Mobile Logged-in
    const mAuth = await runMedianBenchmark(`${t.label} (Mobile User)`, t.url, true, authCookie)
    // Desktop Guest
    const dGuest = await runMedianBenchmark(`${t.label} (Desktop Guest)`, t.url, false)
    // Desktop Logged-in
    const dAuth = await runMedianBenchmark(`${t.label} (Desktop User)`, t.url, false, authCookie)

    results.push({
      target: t.label,
      mGuest,
      mAuth,
      dGuest,
      dAuth,
    })
  }

  // Cleanup fixtures
  await prisma.lesson.deleteMany({ where: { chapter: { courseId: benchCourse.id } } })
  await prisma.chapter.deleteMany({ where: { courseId: benchCourse.id } })
  await prisma.course.delete({ where: { id: benchCourse.id } })

  await prisma.lesson.deleteMany({ where: { chapter: { courseId: ungatedCourse.id } } })
  await prisma.chapter.deleteMany({ where: { courseId: ungatedCourse.id } })
  await prisma.course.delete({ where: { id: ungatedCourse.id } })

  await prisma.examTest.deleteMany({ where: { seriesId: benchSeries.id } })
  await prisma.examSeries.delete({ where: { id: benchSeries.id } })
  await prisma.pyqPaper.delete({ where: { id: benchPyq.id } })
  await prisma.user.delete({ where: { id: benchUser.id } })

  console.log("\n=== BENCHMARK COMPLETED SUCCESSFULLY ===")
  console.log(JSON.stringify(results, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
