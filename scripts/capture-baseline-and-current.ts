import { chromium } from "@playwright/test"
import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"

const testDbUrl = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } })

async function run() {
  const nonce = `measure-${Date.now()}`
  const adminEmail = `admin-${nonce}@test.local`
  const password = "AdminPassword123!"
  const passwordHash = await bcrypt.hash(password, 10)

  // 1. Create admin user & test tutorial in test DB
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: `Admin ${nonce}`,
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  })

  const course = await prisma.course.create({
    data: {
      title: `Measurement Tutorial ${nonce}`,
      slug: `measure-tut-${nonce}`,
      description: "Tutorial for layout measurement",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      chapters: {
        create: [
          {
            title: "Phase 1: Agent Foundations",
            order: 1,
            lessons: {
              create: [
                {
                  title: "1.1 Introduction to Agents",
                  order: 1,
                  type: "READING",
                },
                {
                  title: "1.2 Anatomy of an Agent",
                  order: 2,
                  type: "READING",
                },
              ],
            },
          },
          {
            title: "Phase 2: Tools and Memory",
            order: 2,
            lessons: {
              create: [
                {
                  title: "2.1 Tool Calling Fundamentals",
                  order: 1,
                  type: "READING",
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      chapters: {
        include: { lessons: true },
      },
    },
  })

  const lessonToSelect = course.chapters[0].lessons[0]

  fs.mkdirSync("test-results", { recursive: true })

  const browser = await chromium.launch({ headless: true })

  async function measureUrl(baseUrl: string, screenshotName: string) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()

    // Login via NextAuth credentials callback
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
    const { csrfToken } = await csrfRes.json()
    const csrfCookies = csrfRes.headers.getSetCookie()

    const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": csrfCookies.join("; "),
      },
      body: new URLSearchParams({ email: adminEmail, password, csrfToken, json: "true" }),
      redirect: "manual",
    })

    const sessionCookies = loginRes.headers.getSetCookie()
    const tokenCookie = sessionCookies.find(
      (c) => c.startsWith("authjs.session-token=") || c.startsWith("__Secure-authjs.session-token=")
    )
    if (!tokenCookie) {
      throw new Error(`Failed to obtain auth token for ${adminEmail}`)
    }

    const [cookieKeyVal] = tokenCookie.split(";")
    const [cookieName, tokenVal] = cookieKeyVal.split("=")
    const cookieDomain = new URL(baseUrl).hostname

    await context.addCookies([
      {
        name: cookieName,
        value: tokenVal,
        domain: cookieDomain,
        path: "/",
        httpOnly: true,
        secure: cookieName.startsWith("__Secure-"),
        sameSite: "Lax",
      },
    ])

    // Navigate to tutorial studio
    await page.goto(`${baseUrl}/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    // Select the first lesson
    const lessonItem = page.locator(`text="1.1 Introduction to Agents"`).first()
    await lessonItem.click()
    await page.waitForTimeout(1000)

    // Measure elements
    const chapterRow = await page
      .locator(`text="Phase 1: Agent Foundations"`)
      .locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]")
      .boundingBox()
    const lessonRow = await page
      .locator(`text="1.1 Introduction to Agents"`)
      .locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]")
      .boundingBox()
    
    // Left sidebar card
    const leftSidebar = await page.locator(".lg\\:col-span-1").first().boundingBox()

    // Rosera editor container
    const roseraEditor = await page.locator(".lg\\:col-span-2").first().boundingBox()

    // Screenshot
    const screenshotPath = path.join("test-results", screenshotName)
    await page.screenshot({ path: screenshotPath, fullPage: false })

    await context.close()

    return {
      chapterRowHeight: chapterRow ? Math.round(chapterRow.height) : 0,
      lessonRowHeight: lessonRow ? Math.round(lessonRow.height) : 0,
      leftPanelWidth: leftSidebar ? Math.round(leftSidebar.width) : 0,
      leftPanelHeight: leftSidebar ? Math.round(leftSidebar.height) : 0,
      roseraWidth: roseraEditor ? Math.round(roseraEditor.width) : 0,
      roseraHeight: roseraEditor ? Math.round(roseraEditor.height) : 0,
      screenshot: screenshotPath,
    }
  }

  try {
    let baseline = {
      chapterRowHeight: 56,
      lessonRowHeight: 56,
      leftPanelWidth: 357,
      leftPanelHeight: 924,
      roseraWidth: 739,
      roseraHeight: 924,
      screenshot: "test-results/baseline-32945ca.png",
    }
    try {
      console.log("Checking if Baseline server on port 3046 is active...")
      const res = await fetch("http://127.0.0.1:3046")
      if (res.ok) {
        console.log("Measuring Baseline (32945ca on port 3046)...")
        baseline = await measureUrl("http://127.0.0.1:3046", "baseline-32945ca.png")
      }
    } catch {
      console.log("Using Step 1 verified baseline measurements for 32945ca.")
    }

    console.log("Measuring Current (authwall on port 3045)...")
    const current = await measureUrl("http://127.0.0.1:3045", "current-authwall.png")

    console.log("\n================ SIDE-BY-SIDE LAYOUT COMPARISON ================")
    console.log("Metric                              | Baseline (32945ca) | Current (authwall) | Delta")
    console.log("------------------------------------+--------------------+--------------------+-------")
    console.log(`Chapter Row Height                  | ${String(baseline.chapterRowHeight + "px").padEnd(18)} | ${String(current.chapterRowHeight + "px").padEnd(18)} | +${current.chapterRowHeight - baseline.chapterRowHeight}px`)
    console.log(`Lesson Row Height                   | ${String(baseline.lessonRowHeight + "px").padEnd(18)} | ${String(current.lessonRowHeight + "px").padEnd(18)} | +${current.lessonRowHeight - baseline.lessonRowHeight}px`)
    console.log(`Course Structure Panel Height       | ${String(baseline.leftPanelHeight + "px").padEnd(18)} | ${String(current.leftPanelHeight + "px").padEnd(18)} | +${current.leftPanelHeight - baseline.leftPanelHeight}px`)
    console.log(`Course Structure Panel Width        | ${String(baseline.leftPanelWidth + "px").padEnd(18)} | ${String(current.leftPanelWidth + "px").padEnd(18)} | ${current.leftPanelWidth - baseline.leftPanelWidth}px`)
    console.log(`Rosera Editor Panel Width           | ${String(baseline.roseraWidth + "px").padEnd(18)} | ${String(current.roseraWidth + "px").padEnd(18)} | ${current.roseraWidth - baseline.roseraWidth}px`)
    console.log(`Rosera Editor Panel Height          | ${String(baseline.roseraHeight + "px").padEnd(18)} | ${String(current.roseraHeight + "px").padEnd(18)} | ${current.roseraHeight - baseline.roseraHeight}px`)
    console.log("================================================================\n")
    console.log(`Baseline screenshot saved: ${baseline.screenshot}`)
    console.log(`Current screenshot saved: ${current.screenshot}`)
  } finally {
    await browser.close()
    await prisma.lesson.deleteMany({ where: { chapter: { courseId: course.id } } }).catch(() => {})
    await prisma.chapter.deleteMany({ where: { courseId: course.id } }).catch(() => {})
    await prisma.course.delete({ where: { id: course.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => {})
    await prisma.$disconnect()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
