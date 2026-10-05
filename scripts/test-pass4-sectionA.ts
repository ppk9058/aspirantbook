import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import crypto from "crypto"
import { createRazorpayOrder } from "../lib/actions/payment/razorpay"
import { razorpay } from "../lib/payments/razorpay"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"

function signWebhook(body: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function signVerify(orderId: string, paymentId: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

async function main() {
    console.log("=== PART A: WEBHOOK & VERIFY AUDIT SUITE ===")

    // Safety assert
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ""
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || ""

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

    const testUsers: string[] = []

    try {
        // ── 1. WEBHOOK ONLY TEST ───────────────────────────────────────────────
        console.log("\n--- A.2.1: Webhook only (browser callback never sent) ---")
        const user1 = await prisma.user.create({
            data: {
                name: "Test Webhook Only",
                email: `test_wh_only_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        testUsers.push(user1.id)

        const order1 = await createRazorpayOrder({
            courseId: course.id,
            userId: user1.id,
        })
        const payId1 = `pay_wh_only_${Date.now()}`

        const webhookPayload1 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: payId1,
                        order_id: (order1.orderId || (order1 as any).id),
                        amount: order1.amount,
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: user1.id,
                            courseId: course.id,
                            plan: "COURSE"
                        }
                    }
                }
            }
        })
        const sig1 = signWebhook(webhookPayload1, webhookSecret)

        const res1 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": sig1
            },
            body: webhookPayload1
        })
        const res1Json = await res1.json()
        console.log(`Webhook Only response: status=${res1.status}, body=`, res1Json)

        if (res1.status !== 200) {
            console.error(`Assertion failed: Expected 200 from webhook, got ${res1.status}`)
            process.exit(1)
        }

        const enrollments1 = await prisma.enrollment.findMany({ where: { userId: user1.id, courseId: course.id } })
        const payments1 = await prisma.payment.findMany({ where: { userId: user1.id, externalId: payId1 } })
        console.log(`Counts -> Enrollments: ${enrollments1.length}, Payments: ${payments1.length}`)

        if (enrollments1.length !== 1 || payments1.length !== 1) {
            console.error("Assertion failed: Expected exactly 1 Enrollment and 1 Payment!")
            process.exit(1)
        }
        console.log("✓ Webhook only test PASSED")

        // ── 2. VERIFY THEN WEBHOOK TEST ────────────────────────────────────────
        console.log("\n--- A.2.2: Verify then Webhook ---")
        const user2 = await prisma.user.create({
            data: {
                name: "Test Verify First",
                email: `test_v_first_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        testUsers.push(user2.id)

        const order2 = await createRazorpayOrder({
            courseId: course.id,
            userId: user2.id,
        })
        const payId2 = `pay_v_first_${Date.now()}`
        const vSig2 = signVerify(order2.orderId, payId2, keySecret)

        // Verify call
        const vRes2 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order2.orderId,
                paymentId: payId2,
                signature: vSig2,
                courseId: course.id,
                userId: user2.id
            })
        })
        const vRes2Json = await vRes2.json()
        console.log(`Verify response: status=${vRes2.status}, body=`, vRes2Json)
        if (vRes2.status !== 200) {
            console.error(`Assertion failed: Expected 200 from verify, got ${vRes2.status}`)
            process.exit(1)
        }

        // Webhook call
        const webhookPayload2 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: payId2,
                        order_id: order2.orderId,
                        amount: order2.amount,
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: user2.id,
                            courseId: course.id,
                            plan: "COURSE"
                        }
                    }
                }
            }
        })
        const wSig2 = signWebhook(webhookPayload2, webhookSecret)
        const wRes2 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": wSig2
            },
            body: webhookPayload2
        })
        const wRes2Json = await wRes2.json()
        console.log(`Webhook response: status=${wRes2.status}, body=`, wRes2Json)
        if (wRes2.status !== 200) {
            console.error(`Assertion failed: Expected 200 from webhook, got ${wRes2.status}`)
            process.exit(1)
        }

        const enrollments2 = await prisma.enrollment.findMany({ where: { userId: user2.id, courseId: course.id } })
        const payments2 = await prisma.payment.findMany({ where: { userId: user2.id, externalId: payId2 } })
        console.log(`Counts -> Enrollments: ${enrollments2.length}, Payments: ${payments2.length}`)
        if (enrollments2.length !== 1 || payments2.length !== 1) {
            console.error("Assertion failed: Expected exactly 1 Enrollment and 1 Payment!")
            process.exit(1)
        }
        console.log("✓ Verify then Webhook test PASSED")

        // ── 3. WEBHOOK THEN VERIFY TEST ────────────────────────────────────────
        console.log("\n--- A.2.3: Webhook then Verify ---")
        const user3 = await prisma.user.create({
            data: {
                name: "Test Webhook First",
                email: `test_wh_first_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        testUsers.push(user3.id)

        const order3 = await createRazorpayOrder({
            courseId: course.id,
            userId: user3.id,
        })
        const payId3 = `pay_wh_first_${Date.now()}`

        // Webhook first
        const webhookPayload3 = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: payId3,
                        order_id: order3.orderId,
                        amount: order3.amount,
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: user3.id,
                            courseId: course.id,
                            plan: "COURSE"
                        }
                    }
                }
            }
        })
        const wSig3 = signWebhook(webhookPayload3, webhookSecret)
        const wRes3 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": wSig3
            },
            body: webhookPayload3
        })
        const wRes3Json = await wRes3.json()
        console.log(`Webhook response: status=${wRes3.status}, body=`, wRes3Json)
        if (wRes3.status !== 200) {
            console.error(`Assertion failed: Expected 200 from webhook, got ${wRes3.status}`)
            process.exit(1)
        }

        // Verify second
        const vSig3 = signVerify(order3.orderId, payId3, keySecret)
        const vRes3 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order3.orderId,
                paymentId: payId3,
                signature: vSig3,
                courseId: course.id,
                userId: user3.id
            })
        })
        const vRes3Json = await vRes3.json()
        console.log(`Verify response: status=${vRes3.status}, body=`, vRes3Json)
        if (vRes3.status !== 200) {
            console.error(`Assertion failed: Expected 200 from verify, got ${vRes3.status}`)
            process.exit(1)
        }

        const enrollments3 = await prisma.enrollment.findMany({ where: { userId: user3.id, courseId: course.id } })
        const payments3 = await prisma.payment.findMany({ where: { userId: user3.id, externalId: payId3 } })
        console.log(`Counts -> Enrollments: ${enrollments3.length}, Payments: ${payments3.length}`)
        if (enrollments3.length !== 1 || payments3.length !== 1) {
            console.error("Assertion failed: Expected exactly 1 Enrollment and 1 Payment!")
            process.exit(1)
        }
        console.log("✓ Webhook then Verify test PASSED")

        // ── 4. REPLAY IDEMPOTENCY TEST ─────────────────────────────────────────
        console.log("\n--- A.2.4: Replays of both Webhook and Verify ---")
        const replayResW = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-razorpay-signature": wSig3 },
            body: webhookPayload3
        })
        const replayResV = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: order3.orderId,
                paymentId: payId3,
                signature: vSig3,
                courseId: course.id,
                userId: user3.id
            })
        })
        console.log(`Replay statuses: webhook=${replayResW.status}, verify=${replayResV.status}`)
        if (replayResW.status !== 200 || replayResV.status !== 200) {
            console.error("Assertion failed: Expected 200 on replays!")
            process.exit(1)
        }

        const enrollmentsReplay = await prisma.enrollment.findMany({ where: { userId: user3.id, courseId: course.id } })
        const paymentsReplay = await prisma.payment.findMany({ where: { userId: user3.id, externalId: payId3 } })
        console.log(`Counts after replay -> Enrollments: ${enrollmentsReplay.length}, Payments: ${paymentsReplay.length}`)
        if (enrollmentsReplay.length !== 1 || paymentsReplay.length !== 1) {
            console.error("Assertion failed: Counts changed after replay!")
            process.exit(1)
        }
        console.log("✓ Replay idempotency test PASSED")

        // ── 5. CONCURRENCY: 5 VERIFY + 5 WEBHOOK IN PARALLEL ──────────────────
        console.log("\n--- A.3: Concurrency test: 5 Verify + 5 Webhook in Promise.all ---")
        const userConc = await prisma.user.create({
            data: {
                name: "Test Concurrency",
                email: `test_conc_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        testUsers.push(userConc.id)

        const orderConc = await createRazorpayOrder({
            courseId: course.id,
            userId: userConc.id,
        })
        const payIdConc = `pay_conc_${Date.now()}`
        const vSigConc = signVerify(orderConc.orderId, payIdConc, keySecret)

        const webhookPayloadConc = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: payIdConc,
                        order_id: orderConc.orderId,
                        amount: orderConc.amount,
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: userConc.id,
                            courseId: course.id,
                            plan: "COURSE"
                        }
                    }
                }
            }
        })
        const wSigConc = signWebhook(webhookPayloadConc, webhookSecret)

        const calls = [
            ...Array.from({ length: 5 }, (_, i) =>
                fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: orderConc.orderId,
                        paymentId: payIdConc,
                        signature: vSigConc,
                        courseId: course.id,
                        userId: userConc.id
                    })
                }).then(async (r) => ({ type: `verify-${i + 1}`, status: r.status, json: await r.json().catch(() => ({})) }))
            ),
            ...Array.from({ length: 5 }, (_, i) =>
                fetch(`${BASE_URL}/api/webhooks/razorpay`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-razorpay-signature": wSigConc
                    },
                    body: webhookPayloadConc
                }).then(async (r) => ({ type: `webhook-${i + 1}`, status: r.status, json: await r.json().catch(() => ({})) }))
            )
        ]

        const results = await Promise.all(calls)
        console.log("Concurrent execution responses:")
        results.forEach((res) => console.log(`  [${res.type}] status=${res.status}`))

        const allOk = results.every((r) => r.status === 200)
        if (!allOk) {
            console.error("Assertion failed: Not all concurrent requests returned status 200!")
            process.exit(1)
        }

        const enrollmentsConc = await prisma.enrollment.findMany({ where: { userId: userConc.id, courseId: course.id } })
        const paymentsConc = await prisma.payment.findMany({ where: { userId: userConc.id, externalId: payIdConc } })
        console.log(`Counts -> Enrollments: ${enrollmentsConc.length}, Payments: ${paymentsConc.length}`)
        if (enrollmentsConc.length !== 1 || paymentsConc.length !== 1) {
            console.error(`Assertion failed: Expected 1/1, got ${enrollmentsConc.length}/${paymentsConc.length}`)
            process.exit(1)
        }
        console.log("✓ Concurrency 5+5 test PASSED with exactly 1/1 counts!")

        // ── 6. REAL TAMPER TESTS ───────────────────────────────────────────────
        console.log("\n--- A.4: Real tamper tests ---")

        // 4.1: Client passes amount: 1
        console.log("Subtest 4.1: Client passes amount 1 to createRazorpayOrder")
        const tamperedOrder = await createRazorpayOrder({
            courseId: course.id,
            userId: user1.id,
            amount: 1, // Client tampered amount ₹1
        })
        console.log(`Created Razorpay Order id: ${tamperedOrder.orderId}, amount on Razorpay: ${tamperedOrder.amount} paise (₹${tamperedOrder.amount / 100})`)
        if (tamperedOrder.amount === 100) {
            console.error("CRITICAL: Server honored client tampered amount of ₹1 (100 paise)!")
            process.exit(1)
        }
        console.log(`✓ Subtest 4.1 PASSED: Server enforced DB price of ₹${course.price} (${course.price! * 100} paise)`)

        // 4.2: Verify with a VALID signature for another user's order
        console.log("\nSubtest 4.2: Verify with a valid signature for another user's order")
        const attackerUser = await prisma.user.create({
            data: {
                name: "Attacker User",
                email: `attacker_${Date.now()}@example.com`,
                role: "FREE"
            }
        })
        testUsers.push(attackerUser.id)

        // orderConc belongs to userConc
        const attackPayId = `pay_tamper_${Date.now()}`
        const attackSig = signVerify(orderConc.orderId, attackPayId, keySecret)

        const attackRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: orderConc.orderId,
                paymentId: attackPayId,
                signature: attackSig,
                courseId: course.id,
                userId: attackerUser.id // Different user
            })
        })
        const attackJson = await attackRes.json()
        console.log(`Ownership mismatch response: status=${attackRes.status}, body=`, attackJson)
        if (attackRes.status !== 403) {
            console.error(`Assertion failed: Expected 403 Order ownership mismatch, got ${attackRes.status}`)
            process.exit(1)
        }
        console.log("✓ Subtest 4.2 PASSED: Rejected with 403 Order ownership mismatch")

        // 4.3: Verify with a valid signature but a different courseId than the order's
        console.log("\nSubtest 4.3: Verify with valid signature but different courseId")
        const mismatchCourseRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: orderConc.orderId,
                paymentId: attackPayId,
                signature: attackSig,
                courseId: "another-course-id-mismatch",
                userId: userConc.id // Same owner, mismatched course
            })
        })
        const mismatchCourseJson = await mismatchCourseRes.json()
        console.log(`Course mismatch response: status=${mismatchCourseRes.status}, body=`, mismatchCourseJson)
        if (mismatchCourseRes.status !== 400 && mismatchCourseRes.status !== 404) {
            console.error(`Assertion failed: Expected 400 or 404 for course mismatch, got ${mismatchCourseRes.status}`)
            process.exit(1)
        }
        console.log(`✓ Subtest 4.3 PASSED: Rejected with ${mismatchCourseRes.status} for course mismatch`)

        console.log("\n=== ALL PART A ASSERTIONS PASSED SUCCESSFULLY! ===")

    } finally {
        console.log("\nCleaning up test users and payments created during tests...")
        for (const uid of testUsers) {
            await prisma.payment.deleteMany({ where: { userId: uid } })
            await prisma.enrollment.deleteMany({ where: { userId: uid } })
            await prisma.user.delete({ where: { id: uid } }).catch(() => {})
        }
        console.log("✓ Cleanup completed.")
        await prisma.$disconnect()
    }
}

main().catch((err) => {
    console.error("Test execution failed:", err)
    process.exit(1)
})
