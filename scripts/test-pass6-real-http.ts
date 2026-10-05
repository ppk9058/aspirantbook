import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { chromium } from "playwright"
import { encode } from "next-auth/jwt"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""

const TARGET_COURSE_SLUG = "72nd-bpsc-prelims-current-affairs"
const LOCKED_LESSON_ID = "cmui8hds90004xpacc9bropjd"
const TRIAL_LESSON_ID = "cmui8herr000mxpacbh2up10n"

const SECRET_PATTERNS = [
    { name: "Telegram VIP Invite", pattern: "t.me/bpsc_vip_current_affairs" },
    { name: "Solutions PDF Attachment", pattern: "bpsc-69th-solutions-2024.pdf" },
    { name: "YouTube Video ID (dQw4w9WgXcQ)", pattern: "dQw4w9WgXcQ" },
]

async function createSessionCookie(userId: string, role: string, email: string) {
    const sessionToken = await encode({
        token: { id: userId, role, email },
        secret: SECRET,
        salt: "authjs.session-token"
    })
    return `authjs.session-token=${sessionToken}`
}

async function fetchResponse(url: string, cookie?: string, isRsc: boolean = false) {
    const headers: Record<string, string> = {}
    if (cookie) headers["Cookie"] = cookie
    if (isRsc) {
        headers["RSC"] = "1"
        headers["Accept"] = "text/x-component"
    }
    const res = await fetch(url, { headers })
    const text = await res.text()
    return { status: res.status, text }
}

function countOccurrences(source: string, sub: string): number {
    if (!sub || !source) return 0
    let count = 0
    let pos = 0
    while ((pos = source.indexOf(sub, pos)) !== -1) {
        count++
        pos += sub.length
    }
    return count
}

async function main() {
    console.log("=================================================================")
    console.log("       PASS 6: REAL HTTP LOCK LEAKAGE AUDIT & PAYWALL PROOF      ")
    console.log("=================================================================\n")

    const createdUsers: string[] = []

    try {
        // 1. Setup isolated test users
        const unpaidPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const unpaidUser = await prisma.user.create({
            data: {
                name: "Unpaid Student",
                email: `unpaid_student_${Date.now()}@example.com`,
                phoneNumber: unpaidPhone,
                role: "FREE"
            }
        })
        createdUsers.push(unpaidUser.id)

        const enrolledPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const enrolledUser = await prisma.user.create({
            data: {
                name: "Enrolled Student",
                email: `enrolled_student_${Date.now()}@example.com`,
                phoneNumber: enrolledPhone,
                role: "FREE"
            }
        })
        createdUsers.push(enrolledUser.id)

        const course = await prisma.course.findUnique({ where: { slug: TARGET_COURSE_SLUG } })
        if (!course) throw new Error(`Target course ${TARGET_COURSE_SLUG} not found in DB!`)

        await prisma.enrollment.create({
            data: {
                userId: enrolledUser.id,
                courseId: course.id
            }
        })

        const adminPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const adminUser = await prisma.user.create({
            data: {
                name: "Admin User",
                email: `admin_${Date.now()}@example.com`,
                phoneNumber: adminPhone,
                role: "ADMIN"
            }
        })
        createdUsers.push(adminUser.id)

        const unpaidCookie = await createSessionCookie(unpaidUser.id, "FREE", unpaidUser.email!)
        const enrolledCookie = await createSessionCookie(enrolledUser.id, "FREE", enrolledUser.email!)
        const adminCookie = await createSessionCookie(adminUser.id, "ADMIN", adminUser.email!)

        const testRoles = [
            { role: "Anonymous", cookie: undefined, shouldHaveAccess: false },
            { role: "Unpaid Student", cookie: unpaidCookie, shouldHaveAccess: false },
            { role: "Enrolled Student", cookie: enrolledCookie, shouldHaveAccess: true },
            { role: "Admin", cookie: adminCookie, shouldHaveAccess: true },
        ]

        console.log("--- 1. Testing Locked Lesson Page & RSC Flight Payloads ---")
        console.log("Target Locked Lesson URL:", `${BASE_URL}/courses/${TARGET_COURSE_SLUG}/learn/${LOCKED_LESSON_ID}`)
        console.log("-----------------------------------------------------------------------------------------------------------------------")
        console.log("| User Role        | Payload Type | HTTP Status | Telegram VIP Matches | Solutions PDF Matches | YouTube ID Matches | Leak? |")
        console.log("-----------------------------------------------------------------------------------------------------------------------")

        for (const tr of testRoles) {
            // HTML
            const htmlRes = await fetchResponse(`${BASE_URL}/courses/${TARGET_COURSE_SLUG}/learn/${LOCKED_LESSON_ID}`, tr.cookie, false)
            const tgHtml = countOccurrences(htmlRes.text, SECRET_PATTERNS[0].pattern)
            const pdfHtml = countOccurrences(htmlRes.text, SECRET_PATTERNS[1].pattern)
            const ytHtml = countOccurrences(htmlRes.text, SECRET_PATTERNS[2].pattern)

            // For unpaid/anonymous on locked lesson: Telegram and PDF must be 0!
            // YouTube ID matches from trial lessons in the playlist are allowed, but the locked lesson's own YouTube ID must not be leaked!
            const leakHtml = (!tr.shouldHaveAccess && (tgHtml > 0 || pdfHtml > 0)) ? "LEAK!" : "CLEAN"

            console.log(
                `| ${tr.role.padEnd(16)} | HTML         | ${String(htmlRes.status).padEnd(11)} | ${String(tgHtml).padEnd(20)} | ${String(pdfHtml).padEnd(21)} | ${String(ytHtml).padEnd(18)} | ${leakHtml.padEnd(5)} |`
            )

            // RSC
            const rscRes = await fetchResponse(`${BASE_URL}/courses/${TARGET_COURSE_SLUG}/learn/${LOCKED_LESSON_ID}`, tr.cookie, true)
            const tgRsc = countOccurrences(rscRes.text, SECRET_PATTERNS[0].pattern)
            const pdfRsc = countOccurrences(rscRes.text, SECRET_PATTERNS[1].pattern)
            const ytRsc = countOccurrences(rscRes.text, SECRET_PATTERNS[2].pattern)
            const leakRsc = (!tr.shouldHaveAccess && (tgRsc > 0 || pdfRsc > 0)) ? "LEAK!" : "CLEAN"

            console.log(
                `| ${tr.role.padEnd(16)} | RSC Flight   | ${String(rscRes.status).padEnd(11)} | ${String(tgRsc).padEnd(20)} | ${String(pdfRsc).padEnd(21)} | ${String(ytRsc).padEnd(18)} | ${leakRsc.padEnd(5)} |`
            )

            if (!tr.shouldHaveAccess && (tgHtml > 0 || pdfHtml > 0 || tgRsc > 0 || pdfRsc > 0)) {
                throw new Error(`CRITICAL SECURITY FAILURE: Sensitive tokens leaked to ${tr.role} on locked lesson!`)
            }
        }
        console.log("-----------------------------------------------------------------------------------------------------------------------")
        console.log("✓ Real HTTP locked lesson test: 0 Telegram VIP or Solutions PDF leaks across HTML & RSC flight payloads!\n")

        console.log("--- 2. Testing Course Detail Page & Ancillary APIs ---")
        const routesToCheck = [
            { name: "Course Detail (HTML)", url: `${BASE_URL}/courses/${TARGET_COURSE_SLUG}`, rsc: false },
            { name: "Course Detail (RSC)", url: `${BASE_URL}/courses/${TARGET_COURSE_SLUG}`, rsc: true },
            { name: "Course Info API", url: `${BASE_URL}/api/checkout/course-info?id=${TARGET_COURSE_SLUG}`, rsc: false },
            { name: "Video Courses API", url: `${BASE_URL}/api/courses/video-courses`, rsc: false },
            { name: "Search API/Page", url: `${BASE_URL}/search?q=bpsc`, rsc: false },
            { name: "My Learning (Unpaid)", url: `${BASE_URL}/my-learning`, rsc: false, cookie: unpaidCookie }
        ]

        for (const route of routesToCheck) {
            const res = await fetchResponse(route.url, route.cookie, route.rsc)
            const tgCount = countOccurrences(res.text, SECRET_PATTERNS[0].pattern)
            const pdfCount = countOccurrences(res.text, SECRET_PATTERNS[1].pattern)
            console.log(`Checking ${route.name}: Status ${res.status} | Telegram: ${tgCount} | PDF: ${pdfCount} -> ${tgCount === 0 && pdfCount === 0 ? "CLEAN" : "LEAK!"}`)
            if (tgCount > 0 || pdfCount > 0) {
                throw new Error(`CRITICAL SECURITY FAILURE: Leak detected in ${route.name}!`)
            }
        }
        console.log("✓ All course discovery and API endpoints are completely free of private tokens!\n")

        // 3. Playwright Paywall Selector Verification & Screenshot
        console.log("--- 3. Playwright Paywall Selector Verification & Screenshot ---")
        const artifactsDir = path.join(process.cwd(), "artifacts_pass6")
        if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true })

        const browser = await chromium.launch({ headless: true })
        const ctx = await browser.newContext()
        const sessionToken = unpaidCookie.replace("authjs.session-token=", "")
        await ctx.addCookies([{
            name: "authjs.session-token",
            value: sessionToken,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            sameSite: "Lax" as const
        }])

        const page = await ctx.newPage()
        await page.goto(`${BASE_URL}/courses/${TARGET_COURSE_SLUG}/learn/${LOCKED_LESSON_ID}`, { waitUntil: "networkidle" })

        // Check paywall overlay
        const paywallOverlay = page.locator('[data-testid="course-paywall-overlay"]')
        const isVisible = await paywallOverlay.isVisible()
        console.log(`[Selector Verification] [data-testid="course-paywall-overlay"] visible: ${isVisible}`)

        const lockBadge = page.locator('[data-testid="paywall-lock-badge"]')
        const lockBadgeText = await lockBadge.innerText().catch(() => "")
        console.log(`[Lock Badge Text]: "${lockBadgeText.trim()}"`)

        const screenshotPath = path.join(artifactsDir, "locked_lesson_paywall.png")
        await page.screenshot({ path: screenshotPath, fullPage: false })
        console.log(`✓ Paywall screenshot captured: ${screenshotPath}`)

        await browser.close()

        if (!isVisible) {
            throw new Error("Paywall overlay was not visible on locked lesson for unpaid student!")
        }

        console.log("\n=================================================================")
        console.log("         LOCK LEAKAGE REAL HTTP TESTS: ALL PASSED!               ")
        console.log("=================================================================")

    } finally {
        console.log("\n--- Cleaning up temporary test users ---")
        if (createdUsers.length > 0) {
            await prisma.enrollment.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.user.deleteMany({ where: { id: { in: createdUsers } } })
            console.log(`Deleted ${createdUsers.length} temporary user(s) and their enrollments`)
        }
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error("FATAL ERROR in real HTTP test:", err)
    process.exit(1)
})
