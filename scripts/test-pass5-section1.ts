import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import crypto from "crypto"
import { createRazorpayOrder } from "../lib/actions/payment/razorpay"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const TEST_WEBHOOK_SECRET = "test_wh_sec_pass5_isolated"

function signWebhook(body: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function signVerify(orderId: string, paymentId: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

async function main() {
    console.log("=================================================================")
    console.log("             PASS 5: SECTION 1 AUTOMATED VERIFICATION           ")
    console.log("=================================================================")

    // Safety assert
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ""

    if (!keyId.startsWith("rzp_test_")) {
        console.error("CRITICAL: Key ID does not start with rzp_test_! Aborting.")
        process.exit(1)
    }
    console.log(`✓ Safety check passed: Using test key rzp_test_... (length ${keyId.length})`)

    const courseSlug = "72nd-bpsc-prelims-current-affairs"
    const course = await prisma.course.findUnique({
        where: { slug: courseSlug },
        select: { id: true, title: true, slug: true, price: true }
    })
    if (!course) {
        console.error(`Course not found: ${courseSlug}`)
        process.exit(1)
    }

    const createdUsers: string[] = []
    const createdCourses: string[] = []

    try {
        // ─────────────────────────────────────────────────────────────────
        // 1.2 OPEN REDIRECT TESTS
        // ─────────────────────────────────────────────────────────────────
        console.log("\n=================== 1.2: OPEN REDIRECT AUDIT ===================")
        const redirectVectors = [
            "https://evil.com",
            "//evil.com",
            "/\\evil.com",
            "javascript:alert(1)"
        ]

        for (const vec of redirectVectors) {
            const logoutRes = await fetch(`${BASE_URL}/api/auth/logout?callbackUrl=${encodeURIComponent(vec)}`, {
                method: "GET",
                redirect: "manual"
            })
            const loc = logoutRes.headers.get("location") || ""
            console.log(`[Logout Open Redirect] Vector: "${vec}" -> Status: ${logoutRes.status}, Location: "${loc}"`)
            if (loc.includes("evil.com") || loc.includes("javascript")) {
                throw new Error(`Open redirect vulnerability detected in logout! Location: ${loc}`)
            }
        }

        // Middleware unauthenticated redirect
        const mwRes = await fetch(`${BASE_URL}/dashboard`, {
            method: "GET",
            redirect: "manual"
        })
        const mwLoc = mwRes.headers.get("location") || ""
        console.log(`[Middleware Unauth] GET /dashboard -> Status: ${mwRes.status}, Location: "${mwLoc}"`)
        if (!mwLoc.includes("/login")) {
            throw new Error(`Middleware failed to redirect unauthenticated user to /login! Location: ${mwLoc}`)
        }

        // ─────────────────────────────────────────────────────────────────
        // 1.3 DEMO COUNTER TEST
        // ─────────────────────────────────────────────────────────────────
        console.log("\n=================== 1.3: DEMO COUNTER AUDIT ===================")
        const demoTestCourse = await prisma.course.create({
            data: {
                title: `Demo Counter Test Course ${Date.now()}`,
                slug: `demo-counter-test-${Date.now()}`,
                description: "Test course to verify enrollmentCount does not increment on demo/complete",
                isPremium: true,
                isPublished: true,
                price: 499,
                difficulty: "BEGINNER",
                enrollmentCount: 42
            }
        })
        createdCourses.push(demoTestCourse.id)
        console.log(`[Setup] Created test course ${demoTestCourse.slug} with enrollmentCount = ${demoTestCourse.enrollmentCount}`)

        // Create an isolated test student for demo completion
        const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const demoUser = await prisma.user.create({
            data: {
                name: "Demo Student Test",
                phoneNumber: randomDigits,
                email: `test_demo_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(demoUser.id)

        // Launch Playwright to perform authenticated demo/complete calls
        const { chromium } = await import("playwright")
        const browser = await chromium.launch({ headless: true })
        const context = await browser.newContext()
        const page = await context.newPage()

        try {
            process.env.ALLOW_DEV_MOBILE_LOGIN = "true"
            await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
            await page.click('button:has-text("Continue with Mobile OTP")')
            await page.fill('input[placeholder="Enter 10-digit mobile number"]', randomDigits)
            await page.click('button:has-text("Get OTP")')
            await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

            const otpBoxes = page.locator('input[inputmode="numeric"]')
            for (let i = 0; i < 6; i++) {
                await otpBoxes.nth(i).click()
                await otpBoxes.nth(i).press(`${i + 1}`)
            }
            await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
            console.log(`[Auth] Test student logged in successfully`)

            console.log(`[Execution] Calling POST /api/courses/demo/complete 5 times in authenticated session...`)
            for (let i = 1; i <= 5; i++) {
                const res = await page.evaluate(async (courseId) => {
                    const r = await fetch("/api/courses/demo/complete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ courseId })
                    })
                    return { status: r.status, ok: r.ok, json: await r.json() }
                }, demoTestCourse.id)
                console.log(`  Call #${i}: HTTP ${res.status}, success = ${res.json.success}`)
                if (res.status !== 200) {
                    throw new Error(`Demo call #${i} returned unexpected HTTP ${res.status}`)
                }
            }
        } finally {
            await browser.close()
        }

        const verifyTestCourse = await prisma.course.findUnique({
            where: { id: demoTestCourse.id },
            select: { enrollmentCount: true }
        })
        console.log(`[Result] Initial enrollmentCount: 42, Final enrollmentCount: ${verifyTestCourse?.enrollmentCount}`)
        if (verifyTestCourse?.enrollmentCount !== 42) {
            throw new Error(`FAILURE: enrollmentCount changed from 42 to ${verifyTestCourse?.enrollmentCount}!`)
        }
        console.log(`✓ 1.3 PASS: enrollmentCount is completely unchanged after 5 demo completions`)

        // ─────────────────────────────────────────────────────────────────
        // 1.4 WEBHOOK SECRET AND PAYMENT SUITE
        // ─────────────────────────────────────────────────────────────────
        console.log("\n=================== 1.4: WEBHOOK & PAYMENT AUDIT ===================")

        // A.2.1 Webhook only
        console.log("\n--- A.2.1: Signed webhook only (browser callback never sent) ---")
        const user1 = await prisma.user.create({
            data: {
                name: "Test Webhook Only",
                email: `test_wh_only_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(user1.id)

        const order1 = await createRazorpayOrder({
            courseId: course.id,
            userId: user1.id,
            notes: { courseId: course.id, userId: user1.id }
        })
        const fakePaymentId1 = `pay_wh_only_${Date.now().toString().slice(-8)}`
        const webhookPayload1 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: fakePaymentId1,
                        order_id: order1.orderId,
                        amount: order1.amount,
                        currency: "INR",
                        status: "captured",
                        notes: { courseId: course.id, userId: user1.id }
                    }
                }
            }
        })
        const sig1 = signWebhook(webhookPayload1, TEST_WEBHOOK_SECRET)
        const whRes1 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": sig1
            },
            body: webhookPayload1
        })
        const whStatus1 = whRes1.status
        const paymentCount1 = await prisma.payment.count({ where: { userId: user1.id, externalId: fakePaymentId1 } })
        const enrollCount1 = await prisma.enrollment.count({ where: { userId: user1.id, courseId: course.id } })
        console.log(`Webhook only -> HTTP Status: ${whStatus1}, Payments: ${paymentCount1}, Enrollments: ${enrollCount1}`)
        if (whStatus1 !== 200 || paymentCount1 !== 1 || enrollCount1 !== 1) {
            throw new Error(`A.2.1 Failed: status=${whStatus1}, payments=${paymentCount1}, enrollments=${enrollCount1}`)
        }

        // A.2.2 Verify then Webhook
        console.log("\n--- A.2.2: Verify then Webhook ---")
        const user2 = await prisma.user.create({
            data: {
                name: "Test Verify First",
                email: `test_ver_first_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(user2.id)

        const order2 = await createRazorpayOrder({
            courseId: course.id,
            userId: user2.id,
            notes: { courseId: course.id, userId: user2.id }
        })
        const fakePaymentId2 = `pay_ver_first_${Date.now().toString().slice(-8)}`
        const verifySig2 = signVerify(order2.orderId, fakePaymentId2, keySecret)

        const verRes2 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order2.orderId,
                paymentId: fakePaymentId2,
                signature: verifySig2,
                courseId: course.id,
                userId: user2.id
            })
        })
        const verStatus2 = verRes2.status

        const webhookPayload2 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: fakePaymentId2,
                        order_id: order2.orderId,
                        amount: order2.amount,
                        currency: "INR",
                        status: "captured",
                        notes: { courseId: course.id, userId: user2.id }
                    }
                }
            }
        })
        const whRes2 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": signWebhook(webhookPayload2, TEST_WEBHOOK_SECRET)
            },
            body: webhookPayload2
        })
        const whStatus2 = whRes2.status
        const paymentCount2 = await prisma.payment.count({ where: { userId: user2.id, externalId: fakePaymentId2 } })
        const enrollCount2 = await prisma.enrollment.count({ where: { userId: user2.id, courseId: course.id } })
        console.log(`Verify then Webhook -> Verify HTTP: ${verStatus2}, Webhook HTTP: ${whStatus2}, Payments: ${paymentCount2}, Enrollments: ${enrollCount2}`)
        if (verStatus2 !== 200 || whStatus2 !== 200 || paymentCount2 !== 1 || enrollCount2 !== 1) {
            throw new Error(`A.2.2 Failed: verStatus=${verStatus2}, whStatus=${whStatus2}, payments=${paymentCount2}, enrollments=${enrollCount2}`)
        }

        // A.2.3 Webhook then Verify
        console.log("\n--- A.2.3: Webhook then Verify ---")
        const user3 = await prisma.user.create({
            data: {
                name: "Test Webhook First",
                email: `test_wh_first_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(user3.id)

        const order3 = await createRazorpayOrder({
            courseId: course.id,
            userId: user3.id,
            notes: { courseId: course.id, userId: user3.id }
        })
        const fakePaymentId3 = `pay_wh_first_${Date.now().toString().slice(-8)}`
        const webhookPayload3 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: fakePaymentId3,
                        order_id: order3.orderId,
                        amount: order3.amount,
                        currency: "INR",
                        status: "captured",
                        notes: { courseId: course.id, userId: user3.id }
                    }
                }
            }
        })
        const whRes3 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": signWebhook(webhookPayload3, TEST_WEBHOOK_SECRET)
            },
            body: webhookPayload3
        })
        const whStatus3 = whRes3.status

        const verifySig3 = signVerify(order3.orderId, fakePaymentId3, keySecret)
        const verRes3 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order3.orderId,
                paymentId: fakePaymentId3,
                signature: verifySig3,
                courseId: course.id,
                userId: user3.id
            })
        })
        const verStatus3 = verRes3.status
        const paymentCount3 = await prisma.payment.count({ where: { userId: user3.id, externalId: fakePaymentId3 } })
        const enrollCount3 = await prisma.enrollment.count({ where: { userId: user3.id, courseId: course.id } })
        console.log(`Webhook then Verify -> Webhook HTTP: ${whStatus3}, Verify HTTP: ${verStatus3}, Payments: ${paymentCount3}, Enrollments: ${enrollCount3}`)
        if (whStatus3 !== 200 || verStatus3 !== 200 || paymentCount3 !== 1 || enrollCount3 !== 1) {
            throw new Error(`A.2.3 Failed: whStatus=${whStatus3}, verStatus=${verStatus3}, payments=${paymentCount3}, enrollments=${enrollCount3}`)
        }

        // Replay of each
        console.log("\n--- Replay testing of Webhook & Verify ---")
        const whReplayRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": signWebhook(webhookPayload3, TEST_WEBHOOK_SECRET)
            },
            body: webhookPayload3
        })
        const verReplayRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order3.orderId,
                paymentId: fakePaymentId3,
                signature: verifySig3,
                courseId: course.id,
                userId: user3.id
            })
        })
        const replayPayCount = await prisma.payment.count({ where: { userId: user3.id, externalId: fakePaymentId3 } })
        const replayEnrollCount = await prisma.enrollment.count({ where: { userId: user3.id, courseId: course.id } })
        console.log(`Replays -> Webhook Replay HTTP: ${whReplayRes.status}, Verify Replay HTTP: ${verReplayRes.status}, Payments: ${replayPayCount}, Enrollments: ${replayEnrollCount}`)
        if (replayPayCount !== 1 || replayEnrollCount !== 1) {
            throw new Error(`Replay check failed: counts must stay 1/1, got ${replayPayCount}/${replayEnrollCount}`)
        }

        // Parallel 5 verify + 5 webhook
        console.log("\n--- Parallel Concurrency: 5 Verify + 5 Webhook simultaneously ---")
        const user4 = await prisma.user.create({
            data: {
                name: "Test Concurrent",
                email: `test_concurrent_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(user4.id)

        const order4 = await createRazorpayOrder({
            courseId: course.id,
            userId: user4.id,
            notes: { courseId: course.id, userId: user4.id }
        })
        const fakePaymentId4 = `pay_concurrent_${Date.now().toString().slice(-8)}`
        const verifySig4 = signVerify(order4.orderId, fakePaymentId4, keySecret)
        const webhookPayload4 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: fakePaymentId4,
                        order_id: order4.orderId,
                        amount: order4.amount,
                        currency: "INR",
                        status: "captured",
                        notes: { courseId: course.id, userId: user4.id }
                    }
                }
            }
        })
        const whSig4 = signWebhook(webhookPayload4, TEST_WEBHOOK_SECRET)

        const parallelCalls = []
        for (let i = 0; i < 5; i++) {
            parallelCalls.push(
                fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: order4.orderId,
                        paymentId: fakePaymentId4,
                        signature: verifySig4,
                        courseId: course.id,
                        userId: user4.id
                    })
                }).then(r => r.status)
            )
            parallelCalls.push(
                fetch(`${BASE_URL}/api/webhooks/razorpay`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-razorpay-signature": whSig4
                    },
                    body: webhookPayload4
                }).then(r => r.status)
            )
        }

        const results = await Promise.all(parallelCalls)
        const concurrentPayments = await prisma.payment.count({ where: { userId: user4.id, externalId: fakePaymentId4 } })
        const concurrentEnrollments = await prisma.enrollment.count({ where: { userId: user4.id, courseId: course.id } })
        console.log(`Parallel Results: ${results.join(", ")}`)
        console.log(`Counts after 10 concurrent calls -> Payments: ${concurrentPayments}, Enrollments: ${concurrentEnrollments}`)
        if (concurrentPayments !== 1 || concurrentEnrollments !== 1) {
            throw new Error(`Concurrency check failed: expected 1/1, got ${concurrentPayments}/${concurrentEnrollments}`)
        }

        // ─────────────────────────────────────────────────────────────────
        // 1.5 PROGRESS ACCESS CHECK
        // ─────────────────────────────────────────────────────────────────
        console.log("\n=================== 1.5: PROGRESS ACCESS CHECK ===================")
        const lessons = await prisma.lesson.findMany({
            where: { chapter: { courseId: course.id } },
            select: { id: true, title: true, isTrial: true }
        })
        const paidLesson = lessons.find(l => !l.isTrial)
        const trialLesson = lessons.find(l => l.isTrial)

        if (!paidLesson) throw new Error("Could not find a paid lesson for progress test")
        console.log(`Paid lesson : ${paidLesson.title} (${paidLesson.id})`)
        if (trialLesson) console.log(`Trial lesson: ${trialLesson.title} (${trialLesson.id})`)

        // 1. Anonymous test via direct fetch (no session)
        const anonRes = await fetch(`${BASE_URL}/api/courses/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lessonId: trialLesson ? trialLesson.id : paidLesson.id,
                timeSpent: 30,
                completed: true
            })
        })
        const anonBody = await anonRes.json()
        console.log(`Anonymous on lesson -> HTTP ${anonRes.status}, Body:`, anonBody)
        if (anonRes.status !== 401) {
            throw new Error(`Expected 401 for anonymous caller on progress API, got ${anonRes.status}`)
        }

        // 2. Authenticated unpaid student via Playwright
        const progPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const progUser = await prisma.user.create({
            data: {
                name: "Progress Test Student",
                phoneNumber: progPhone,
                email: `prog_student_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        createdUsers.push(progUser.id)

        const progBrowser = await chromium.launch({ headless: true })
        const progContext = await progBrowser.newContext()
        const progPage = await progContext.newPage()

        try {
            await progPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
            await progPage.click('button:has-text("Continue with Mobile OTP")')
            await progPage.fill('input[placeholder="Enter 10-digit mobile number"]', progPhone)
            await progPage.click('button:has-text("Get OTP")')
            await progPage.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

            const otpBoxes = progPage.locator('input[inputmode="numeric"]')
            for (let i = 0; i < 6; i++) {
                await otpBoxes.nth(i).click()
                await otpBoxes.nth(i).press(`${i + 1}`)
            }
            await progPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
            console.log(`[Auth] Student logged in for progress tests`)

            // (a) Unpaid student on paid lesson -> 403 Forbidden
            const unpaidResult = await progPage.evaluate(async (lessonId) => {
                const r = await fetch("/api/courses/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lessonId, timeSpent: 45, completed: true })
                })
                return { status: r.status, body: await r.json() }
            }, paidLesson.id)
            console.log(`Unpaid student on paid lesson -> HTTP ${unpaidResult.status}, Body:`, unpaidResult.body)
            if (unpaidResult.status !== 403) {
                throw new Error(`Expected 403 for unpaid student on paid lesson, got ${unpaidResult.status}`)
            }

            // (b) Enroll student in course -> 200 OK
            await prisma.enrollment.create({
                data: {
                    userId: progUser.id,
                    courseId: course.id
                }
            })

            const paidResult = await progPage.evaluate(async (lessonId) => {
                const r = await fetch("/api/courses/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lessonId, timeSpent: 45, completed: true })
                })
                return { status: r.status, body: await r.json() }
            }, paidLesson.id)
            console.log(`Paid student on paid lesson -> HTTP ${paidResult.status}, Body:`, paidResult.body)
            if (paidResult.status !== 200) {
                throw new Error(`Expected 200 for paid student on paid lesson, got ${paidResult.status}`)
            }
        } finally {
            await progBrowser.close()
        }

        console.log("\n=================================================================")
        console.log("            SECTION 1 VERIFICATION: ALL TESTS PASSED!           ")
        console.log("=================================================================")

    } finally {
        // Cleanup test users and test courses
        console.log("\n--- Cleaning up test artifacts ---")
        if (createdCourses.length > 0) {
            await prisma.course.deleteMany({ where: { id: { in: createdCourses } } })
            console.log(`Deleted ${createdCourses.length} test course(s)`)
        }
        if (createdUsers.length > 0) {
            await (prisma as any).couponRedemption?.deleteMany({ where: { userId: { in: createdUsers } } }).catch(() => {})
            await prisma.progress.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.enrollment.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.payment.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.user.deleteMany({ where: { id: { in: createdUsers } } })
            console.log(`Deleted ${createdUsers.length} test user(s)`)
        }
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error("FATAL ERROR in Section 1 test:", err)
    process.exit(1)
})
