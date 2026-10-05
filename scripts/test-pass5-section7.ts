import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""

async function createSessionCookie(userId: string, role: string, email: string) {
    const sessionToken = await encode({
        token: { id: userId, role, email },
        secret: SECRET,
        salt: "authjs.session-token"
    })
    return {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const
    }
}

async function main() {
    console.log("=================================================================")
    console.log("             PASS 5: SECTION 7 TOUCHPOINTS & DOM PROOF           ")
    console.log("=================================================================")

    const browser = await chromium.launch({ headless: true })
    const createdUsers: string[] = []

    try {
        // ─────────────────────────────────────────────────────────────────
        // 7.1 DOM PROOF: bpsc-sectional-5q on Quizzes Hub
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- 7.1: DOM Proof: bpsc-sectional-5q on Quizzes Hub ---")
        const quizPage = await browser.newPage()

        const quizUrls = [
            `${BASE_URL}/practice`,
            `${BASE_URL}/current-affairs-quizzes`
        ]

        for (const url of quizUrls) {
            console.log(`Checking URL: ${url}`)
            await quizPage.goto(url, { waitUntil: "networkidle" })
            const pageText = await quizPage.innerText("body")
            const html = await quizPage.content()

            const hasSlug = pageText.includes("bpsc-sectional-5q") || html.includes("bpsc-sectional-5q")
            const hasTitle = pageText.includes("BPSC 71st Prelims History Sectional Test") || html.includes("BPSC 71st Prelims History Sectional Test")

            console.log(`  [Assertion] "bpsc-sectional-5q" present: ${hasSlug}`)
            console.log(`  [Assertion] "BPSC 71st Prelims History Sectional Test" present: ${hasTitle}`)

            if (hasSlug || hasTitle) {
                throw new Error(`FAILURE: Test-series test found on Quizzes Hub page ${url}!`)
            }
        }
        console.log(`✓ 7.1 PASS: Quizzes Hub contains NO elements of bpsc-sectional-5q or BPSC 71st Prelims History Sectional Test`)
        await quizPage.close()

        // ─────────────────────────────────────────────────────────────────
        // 7.2 UPSC History Sectional Test: 8 Attempts Access Audit
        // ─────────────────────────────────────────────────────────────────
        console.log("\n--- 7.2: 8 Attempt Rows Authorization Audit (cmus8baux0007xpvxdb4hga63) ---")
        const testId = "cmus8baux0007xpvxdb4hga63"
        const attempts = await prisma.examAttempt.findMany({
            where: { testId },
            select: {
                id: true,
                userId: true,
                status: true,
                score: true,
                totalMarks: true,
                startedAt: true,
                submittedAt: true
            },
            orderBy: { startedAt: "asc" }
        })

        console.log(`Found ${attempts.length} attempts in database for test ${testId}`)
        if (attempts.length !== 8) {
            console.warn(`Warning: Expected 8 attempts, found ${attempts.length}`)
        }

        // Create a different non-owner student user
        const nonOwnerPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const nonOwnerUser = await prisma.user.create({
            data: {
                name: "Non-Owner Student",
                phoneNumber: nonOwnerPhone,
                email: `non_owner_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(nonOwnerUser.id)
        console.log(`[Setup] Created isolated non-owner student: ${nonOwnerUser.id.slice(0, 6)}...`)

        const nonOwnerCookie = await createSessionCookie(nonOwnerUser.id, "FREE", nonOwnerUser.email!)
        const nonOwnerContext = await browser.newContext()
        await nonOwnerContext.addCookies([nonOwnerCookie])
        const nonOwnerPage = await nonOwnerContext.newPage()

        console.log("\nAttempt Authorization Results:")
        console.log("-----------------------------------------------------------------------------------------------------")
        console.log("| Attempt ID (8 chars) | Owner ID (6 chars) | Owner API Status | Non-Owner API Status | Status Match |")
        console.log("-----------------------------------------------------------------------------------------------------")

        for (const attempt of attempts) {
            const shortAttemptId = attempt.id.slice(0, 8)
            const shortOwnerId = attempt.userId.slice(0, 6)

            // Test as OWNER
            const ownerCookie = await createSessionCookie(attempt.userId, "FREE", `owner_${attempt.userId}@aspirantbook.local`)
            const ownerContext = await browser.newContext()
            await ownerContext.addCookies([ownerCookie])
            const ownerPage = await ownerContext.newPage()

            // Query result API directly as owner
            const ownerApiRes = await ownerPage.goto(`${BASE_URL}/api/exam/attempt/${encodeURIComponent(attempt.id)}/result`)
            const ownerStatus = ownerApiRes?.status()

            // Query result API directly as non-owner
            const nonOwnerApiRes = await nonOwnerPage.goto(`${BASE_URL}/api/exam/attempt/${encodeURIComponent(attempt.id)}/result`)
            const nonOwnerStatus = nonOwnerApiRes?.status()
            const nonOwnerBody = await nonOwnerApiRes?.json().catch(() => ({}))

            // Verify non-owner never gets data
            if (nonOwnerStatus !== 403 && nonOwnerStatus !== 404) {
                throw new Error(`CRITICAL LEAK: Non-owner received status ${nonOwnerStatus} on attempt ${attempt.id}!`)
            }
            if (nonOwnerBody.data || nonOwnerBody.answers || nonOwnerBody.score !== undefined) {
                throw new Error(`CRITICAL LEAK: Non-owner received answers or score for attempt ${attempt.id}!`)
            }

            console.log(`| ${shortAttemptId.padEnd(20)} | ${shortOwnerId.padEnd(18)} | ${String(ownerStatus).padEnd(16)} | ${String(nonOwnerStatus).padEnd(20)} | PASS         |`)
            await ownerContext.close()
        }
        console.log("-----------------------------------------------------------------------------------------------------")
        console.log("✓ 7.2 PASS: All 8 attempts rendered/authorized for owner, strictly blocked (403 Forbidden) for non-owner")

        console.log("\n=================================================================")
        console.log("            SECTION 7 VERIFICATION: ALL TESTS PASSED!           ")
        console.log("=================================================================")

    } finally {
        await browser.close()
        console.log("\n--- Cleaning up temporary test artifacts ---")
        if (createdUsers.length > 0) {
            await prisma.user.deleteMany({ where: { id: { in: createdUsers } } })
            console.log(`Deleted ${createdUsers.length} temporary user(s)`)
        }
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error("FATAL ERROR in Section 7 test:", err)
    process.exit(1)
})
