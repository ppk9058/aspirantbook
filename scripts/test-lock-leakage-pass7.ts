import { chromium } from "playwright"
import { prisma } from "../lib/prisma"
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper"
import path from "path"
import fs from "fs"

const BASE_URL = "http://localhost:3000"
const COURSE_SLUG = "72nd-bpsc-prelims-current-affairs"

async function main() {
    console.log("=== E. LOCK LEAKAGE RETEST (PASS 7) ===")

    // 1. Fetch real course and lesson IDs from DB
    const course = await prisma.course.findFirst({
        where: { slug: COURSE_SLUG },
        include: {
            chapters: {
                include: {
                    lessons: { orderBy: { order: "asc" } },
                },
            },
        },
    })
    if (!course) throw new Error("Course not found")

    const lessons = course.chapters.flatMap((c) => c.lessons)
    const lesson9 = lessons.find((l) => l.title === "Lesson - 9")!
    const auditorLesson = lessons.find((l) => l.title === "Auditor paper discussion")!
    const linkLesson = lessons.find((l) => l.title === "Link")!
    const trialLesson = lessons.find((l) => l.isTrial && l.videoUrl)!

    console.log("Target Lessons from DB:")
    console.table([
        { Name: "Lesson - 9 (Locked Video)", ID: lesson9.id, isTrial: lesson9.isTrial, video: lesson9.videoUrl?.slice(0, 35) },
        { Name: "Auditor (Locked Video)", ID: auditorLesson.id, isTrial: auditorLesson.isTrial, video: auditorLesson.videoUrl?.slice(0, 35) },
        { Name: "Link (Locked Telegram)", ID: linkLesson.id, isTrial: linkLesson.isTrial, attachment: linkLesson.attachmentUrl?.slice(0, 35) },
        { Name: "Trial Lesson (Preview)", ID: trialLesson.id, isTrial: trialLesson.isTrial, video: trialLesson.videoUrl?.slice(0, 35) },
    ])

    // Sensitive tokens to detect leaks
    const tokens = {
        lesson9VideoUrl: lesson9.videoUrl || "",
        lesson9YtId: lesson9.videoUrl ? lesson9.videoUrl.split("v=")[1]?.split("&")[0] || "" : "",
        auditorVideoUrl: auditorLesson.videoUrl || "",
        auditorYtId: auditorLesson.videoUrl ? auditorLesson.videoUrl.split("v=")[1]?.split("&")[0] || "" : "",
        telegramUrl: linkLesson.attachmentUrl || "",
        telegramText: "bpsc_vip_current",
        solutionPdfUrl: "/uploads/pyq/bpsc-69th-solutions",
    }

    // --- E.1: Anonymous First Status and Location without Following Redirect ---
    console.log("\n--- E.1: ANONYMOUS FIRST STATUS (NO REDIRECT FOLLOW) ---")
    const checkRedirect = async (urlPath: string) => {
        const res = await fetch(`${BASE_URL}${urlPath}`, { redirect: "manual" })
        return {
            status: res.status,
            location: res.headers.get("location") || "NONE",
        }
    }

    const anonL9 = await checkRedirect(`/courses/${COURSE_SLUG}/learn/${lesson9.id}`)
    const anonAuditor = await checkRedirect(`/courses/${COURSE_SLUG}/learn/${auditorLesson.id}`)
    const anonLink = await checkRedirect(`/courses/${COURSE_SLUG}/learn/${linkLesson.id}`)

    console.table([
        { Target: "Lesson - 9", Path: `/courses/${COURSE_SLUG}/learn/${lesson9.id}`, Status: anonL9.status, Location: anonL9.location },
        { Target: "Auditor Discussion", Path: `/courses/${COURSE_SLUG}/learn/${auditorLesson.id}`, Status: anonAuditor.status, Location: anonAuditor.location },
        { Target: "Link Lesson", Path: `/courses/${COURSE_SLUG}/learn/${linkLesson.id}`, Status: anonLink.status, Location: anonLink.location },
    ])

    console.log("\nEXPLANATION FOR PASS 6 200 vs 307:")
    console.log("In Pass 6, the test used Playwright page.goto() which automatically followed the HTTP 307 redirect to /login and reported the terminal page HTTP status (200 OK for /login). When checked with redirect: 'manual', the first response is strictly HTTP 307 Temporary Redirect to /login.")

    // --- E.2: SCAN 4 ROLES ACROSS HTML, RSC, AND ANCILLARY APIS ---
    console.log("\n--- E.2: SCANNING 4 ROLES ACROSS HTML, RSC, AND ANCILLARY APIS ---")

    // Create test users using helper
    const unpaidUser = await createTestUser({ prefix: "p7-unpaid", role: "FREE" })
    const enrolledUser = await createTestUser({ prefix: "p7-enrolled", role: "FREE" })
    await prisma.enrollment.create({
        data: { userId: enrolledUser.id, courseId: course.id },
    })
    const adminUser = await createTestUser({ prefix: "p7-admin", role: "ADMIN" })

    const browser = await chromium.launch({ headless: true })

    const loginAndGetSession = async (user: any) => {
        const context = await browser.newContext()
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
        await page.click('button:has-text("Continue with Mobile OTP")')
        await page.fill('input[placeholder="Enter 10-digit mobile number"]', user.phoneNumber)
        await page.click('button:has-text("Get OTP")')
        await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })
        const boxes = page.locator('input[inputmode="numeric"]')
        for (let i = 0; i < 6; i++) {
            await boxes.nth(i).click()
            await boxes.nth(i).press(`${i + 1}`)
        }
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
        const cookies = await context.cookies()
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")
        return { context, page, cookieHeader }
    }

    try {
        console.log("Logging in test users...")
        const unpaidSession = await loginAndGetSession(unpaidUser)
        const enrolledSession = await loginAndGetSession(enrolledUser)
        const adminSession = await loginAndGetSession(adminUser)

        const scanPayload = (text: string) => {
            let l9Count = 0
            if (tokens.lesson9YtId && text.includes(tokens.lesson9YtId)) l9Count++
            let auditorCount = 0
            if (tokens.auditorYtId && text.includes(tokens.auditorYtId)) auditorCount++
            let tgCount = 0
            if (tokens.telegramText && text.includes(tokens.telegramText)) tgCount++
            let pdfCount = 0
            if (tokens.solutionPdfUrl && text.includes(tokens.solutionPdfUrl)) pdfCount++
            return { l9Count, auditorCount, tgCount, pdfCount }
        }

        const testEndpoints = [
            { name: "Course Page (HTML)", url: `${BASE_URL}/courses/${COURSE_SLUG}`, isRsc: false },
            { name: "Course Page (RSC)", url: `${BASE_URL}/courses/${COURSE_SLUG}`, isRsc: true },
            { name: "Learn Lesson - 9 (HTML)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${lesson9.id}`, isRsc: false },
            { name: "Learn Lesson - 9 (RSC)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${lesson9.id}`, isRsc: true },
            { name: "Learn Auditor (HTML)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${auditorLesson.id}`, isRsc: false },
            { name: "Learn Auditor (RSC)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${auditorLesson.id}`, isRsc: true },
            { name: "Learn Link (HTML)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${linkLesson.id}`, isRsc: false },
            { name: "Learn Link (RSC)", url: `${BASE_URL}/courses/${COURSE_SLUG}/learn/${linkLesson.id}`, isRsc: true },
            { name: "API: Video Courses", url: `${BASE_URL}/api/courses/video-courses`, isRsc: false },
            { name: "API: Checkout Info", url: `${BASE_URL}/api/checkout/course-info?id=${COURSE_SLUG}`, isRsc: false },
            { name: "Search: Current Affairs", url: `${BASE_URL}/search?q=current+affairs`, isRsc: false },
            { name: "My Learning", url: `${BASE_URL}/my-learning`, isRsc: false },
            { name: "Sitemap", url: `${BASE_URL}/sitemap.xml`, isRsc: false },
        ]

        const sessions = [
            { role: "Anonymous", cookieHeader: "" },
            { role: "Unpaid Student", cookieHeader: unpaidSession.cookieHeader },
            { role: "Enrolled Student", cookieHeader: enrolledSession.cookieHeader },
            { role: "Admin", cookieHeader: adminSession.cookieHeader },
        ]

        const resultsTable: any[] = []

        for (const ep of testEndpoints) {
            for (const s of sessions) {
                const headers: Record<string, string> = {}
                if (s.cookieHeader) headers["Cookie"] = s.cookieHeader
                if (ep.isRsc) headers["RSC"] = "1"

                const res = await fetch(ep.url, { headers, redirect: "manual" })
                const text = res.status === 200 ? await res.text() : ""
                const matches = scanPayload(text)

                const isLeak =
                    (s.role === "Anonymous" || s.role === "Unpaid Student") &&
                    (matches.l9Count > 0 || matches.auditorCount > 0 || matches.tgCount > 0 || matches.pdfCount > 0)

                resultsTable.push({
                    Endpoint: ep.name,
                    Role: s.role,
                    Status: res.status,
                    L9_Video: matches.l9Count,
                    Auditor_Video: matches.auditorCount,
                    Telegram_VIP: matches.tgCount,
                    Solution_PDF: matches.pdfCount,
                    Leak: isLeak ? "LEAK!" : "CLEAN",
                })
            }
        }

        console.table(resultsTable.filter((r) => r.Role === "Anonymous" || r.Role === "Unpaid Student"))

        // --- E.3: PAYWALL EXPLANATION WITH REAL IDS AND PLAYWRIGHT SCREENSHOT ---
        console.log("\n--- E.3: PAYWALL OVERLAY EXPLANATION & REAL SCREENSHOT ---")
        console.log(`Real Trial Lesson: id=${trialLesson.id} (title="${trialLesson.title}")`)
        console.log(`Real Locked Lesson: id=${lesson9.id} (title="${lesson9.title}")`)

        // Navigate to locked lesson as unpaid student
        await unpaidSession.page.goto(`${BASE_URL}/courses/${COURSE_SLUG}/learn/${lesson9.id}`, { waitUntil: "networkidle" })
        const paywallOverlay = unpaidSession.page.locator('[data-testid="course-paywall-overlay"]')
        const isPaywallVisible = await paywallOverlay.isVisible().catch(() => false)
        console.log(`[data-testid="course-paywall-overlay"] visible on Locked Lesson: ${isPaywallVisible}`)

        const shotPath = path.join(process.cwd(), "artifacts_pass6", "pass7_locked_paywall_proof.png")
        await unpaidSession.page.screenshot({ path: shotPath })
        console.log(`Saved screenshot to: ${shotPath}`)
    } finally {
        await browser.close()
        await teardownTestUsers([unpaidUser.id, enrolledUser.id, adminUser.id])
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
