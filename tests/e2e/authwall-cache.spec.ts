import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, createActor, loginAs } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("Authwall: Cache Isolation, Entitlement Boundaries & Bot/Human Variant Separation", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let enrolledUser: any
  let unenrolledUser: any
  let course: any
  let chapter: any
  let lesson: any

  const SECRET_CONTENT = "SECRET_RESTRICTED_PARAGRAPH_CACHE_AUDIT"
  const PREVIEW_CONTENT = "PUBLIC_PREVIEW_PARAGRAPH_CACHE_AUDIT"

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "cache-admin")
    enrolledUser = await createActor(nonce, UserRole.FREE, "cache-enrolled")
    unenrolledUser = await createActor(nonce, UserRole.FREE, "cache-unenrolled")

    // Create a gated course with bot-full seoMode
    course = await prisma.course.create({
      data: {
        title: `Cache Audit Course ${nonce}`,
        slug: `cache-course-${nonce.toLowerCase()}`,
        description: "Course for verifying cache boundaries and isolation",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "bot-full",
        gateTitle: "Gated Course",
        gateSubtitle: "Sign in to access full course",
      },
    })

    chapter = await prisma.chapter.create({
      data: {
        title: "Cache Audit Chapter 1",
        courseId: course.id,
        order: 1,
        gateMode: "inherit",
      },
    })

    lesson = await prisma.lesson.create({
      data: {
        title: "Cache Audit Lesson 1",
        chapterId: chapter.id,
        order: 1,
        type: "TUTORIAL",
        content: [
          `<h2>${PREVIEW_CONTENT}</h2>`,
          `<p>Paragraph two intro.</p>`,
          `<p>Paragraph three details.</p>`,
          `<p>Paragraph four analysis.</p>`,
          `<p>${SECRET_CONTENT}</p>`,
        ].join("\n"),
      },
    })
  })

  test.afterAll(async () => {
    try {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: course.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: course.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: course.id } }).catch(() => {})
      const uIds = [adminUser?.id, enrolledUser?.id, unenrolledUser?.id].filter(Boolean)
      if (uIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: uIds } } }).catch(() => {})
      }
    } catch {}
  })

  test("CACHE-01: Guest -> User -> Guest on same URL with warm caches preserves strict guest isolation", async ({ browser }) => {
    const contextGuest1 = await browser.newContext()
    const pageGuest1 = await contextGuest1.newPage()

    // 1. First Guest Request (Cold Cache)
    const res1 = await pageGuest1.goto(`/tutorials/${course.slug}`)
    expect(res1?.status()).toBe(200)

    const cacheControl = res1?.headers()["cache-control"] || ""
    // Verify that cache-control does NOT permit public caching across users
    expect(cacheControl).toMatch(/private|no-store|no-cache|must-revalidate/i)

    const content1 = await pageGuest1.content()
    expect(content1).toContain(PREVIEW_CONTENT)
    expect(content1).not.toContain(SECRET_CONTENT)
    await contextGuest1.close()

    // 2. Logged-in User Request (Warms user session on same URL)
    const contextUser = await browser.newContext()
    const pageUser = await contextUser.newPage()
    await loginAs(pageUser, enrolledUser.email)

    const resUser = await pageUser.goto(`/tutorials/${course.slug}`)
    expect(resUser?.status()).toBe(200)

    // Enrolled/authenticated user should see full content
    const contentUser = await pageUser.content()
    expect(contentUser).toContain(SECRET_CONTENT)
    await contextUser.close()

    // 3. Second Guest Request on the SAME URL immediately after
    // MUST NOT receive the logged-in user's warm response
    const contextGuest2 = await browser.newContext()
    const pageGuest2 = await contextGuest2.newPage()

    const res2 = await pageGuest2.goto(`/tutorials/${course.slug}`)
    expect(res2?.status()).toBe(200)

    const content2 = await pageGuest2.content()
    expect(content2).toContain(PREVIEW_CONTENT)
    expect(content2).not.toContain(SECRET_CONTENT)
    await contextGuest2.close()
  })

  test("CACHE-02: Two users with different entitlements receive respective content independently", async ({ browser }) => {
    // User A: Admin (Has privileged admin entitlement across all gated content)
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await loginAs(pageA, adminUser.email)
    await pageA.goto(`/tutorials/${course.slug}`)
    const contentA = await pageA.content()
    expect(contentA).toContain(SECRET_CONTENT)
    await contextA.close()

    // User B: Anonymous Guest (Has no entitlement, gets preview slice only)
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await pageB.goto(`/tutorials/${course.slug}`)
    const contentB = await pageB.content()
    expect(contentB).toContain(PREVIEW_CONTENT)
    expect(contentB).not.toContain(SECRET_CONTENT)
    await contextB.close()
  })

  test("CACHE-03: Logout then browser Back shows only the preview slice, never secret content", async ({ page, context }) => {
    // 1. Log in as user
    await loginAs(page, enrolledUser.email)
    await page.goto(`/tutorials/${course.slug}`)
    let content = await page.content()
    expect(content).toContain(SECRET_CONTENT)

    // 2. Navigate away to another page (e.g. dashboard)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/.*dashboard.*/)

    // 3. Clear auth cookies (simulate logout)
    await context.clearCookies()

    // 4. Hit browser back button and revalidate against server
    await page.goBack()
    await page.reload()

    // 5. Verify page content has revalidated and does NOT leak secret content
    content = await page.content()
    expect(content).not.toContain(SECRET_CONTENT)
    expect(content).toContain(PREVIEW_CONTENT)
  })

  test("CACHE-04: Verified-bot variant response never reaches human guests or users", async ({ request, browser }) => {
    // 1. Request as verified crawler (with bot verification headers)
    const botRes = await request.get(`/tutorials/${course.slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) VerifiedCrawlerMock",
        "X-Forwarded-For": "127.0.0.2",
      },
    })
    expect(botRes.status()).toBe(200)
    const botText = await botRes.text()

    // Because course.seoMode === "bot-full", verified bot receives full text
    expect(botText).toContain(SECRET_CONTENT)

    // 2. Immediate request as normal human guest via browser
    const humanContext = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })
    const humanPage = await humanContext.newPage()
    await humanPage.goto(`/tutorials/${course.slug}`)

    const humanContent = await humanPage.content()

    // Human guest MUST NOT receive the cached bot-full variant
    expect(humanContent).not.toContain(SECRET_CONTENT)
    expect(humanContent).toContain(PREVIEW_CONTENT)

    await humanContext.close()
  })
})
