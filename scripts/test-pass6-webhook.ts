import crypto from "crypto"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const WEBHOOK_SECRET = "test_wh_sec_pass5_isolated"
const BASE_URL = "http://localhost:3000"

function signPayload(body: string): string {
    return crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
}

async function sendWebhook(eventObj: any) {
    const rawBody = JSON.stringify(eventObj)
    const signature = signPayload(rawBody)

    const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-razorpay-signature": signature,
        },
        body: rawBody,
    })

    const status = res.status
    const text = await res.text()
    let json: any = null
    try {
        json = JSON.parse(text)
    } catch {
        json = text
    }
    return { status, body: json }
}

async function main() {
    console.log("=== PASS 6 SECTION 5: REAL SIGNED WEBHOOK TESTS ===")

    // Target course: 72nd-bpsc-prelims-current-affairs (price: 3299 => 329900 paise)
    const course = await prisma.course.findFirst({
        where: { slug: "72nd-bpsc-prelims-current-affairs" },
        select: { id: true, slug: true, price: true },
    })
    if (!course) throw new Error("Course 72nd-bpsc-prelims-current-affairs not found")

    // Create 4 isolated test users for each scenario
    const timestamp = Date.now()
    const users = await Promise.all([
        prisma.user.create({
            data: {
                id: `u-p6-wh1-${timestamp}`,
                email: `test_wh1_${timestamp}@example.test`,
                name: "WH Test User 1 (payment.captured)",
            },
        }),
        prisma.user.create({
            data: {
                id: `u-p6-wh2-${timestamp}`,
                email: `test_wh2_${timestamp}@example.test`,
                name: "WH Test User 2 (order.paid)",
            },
        }),
        prisma.user.create({
            data: {
                id: `u-p6-wh3-${timestamp}`,
                email: `test_wh3_${timestamp}@example.test`,
                name: "WH Test User 3 (unknown event)",
            },
        }),
        prisma.user.create({
            data: {
                id: `u-p6-wh4-${timestamp}`,
                email: `test_wh4_${timestamp}@example.test`,
                name: "WH Test User 4 (mismatched amount)",
            },
        }),
    ])

    const cleanup = async () => {
        const userIds = users.map((u) => u.id)
        await prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } })
        await prisma.payment.deleteMany({ where: { userId: { in: userIds } } })
        await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }

    try {
        // --- Test 1: payment.captured for a valid order -> 200, enrolls ---
        console.log("\n--- TEST 1: payment.captured (valid) ---")
        const payload1 = {
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: `pay_p6_1_${timestamp}`,
                        order_id: `order_p6_1_${timestamp}`,
                        amount: 329900,
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: users[0].id,
                            courseId: course.id,
                        },
                    },
                },
                order: {
                    entity: {
                        id: `order_p6_1_${timestamp}`,
                        amount: 329900,
                        currency: "INR",
                        notes: {
                            userId: users[0].id,
                            courseId: course.id,
                        },
                    },
                },
            },
        }

        const count1_before = await prisma.enrollment.count({ where: { userId: users[0].id } })
        const res1 = await sendWebhook(payload1)
        const count1_after = await prisma.enrollment.count({ where: { userId: users[0].id } })
        const pay1_after = await prisma.payment.count({ where: { userId: users[0].id } })
        console.log("Status:", res1.status)
        console.log("Response:", JSON.stringify(res1.body))
        console.log(`Enrollment before: ${count1_before}, after: ${count1_after}`)
        console.log(`Payment records created: ${pay1_after}`)
        if (res1.status !== 200 || count1_after !== 1 || pay1_after !== 1) {
            throw new Error(`TEST 1 FAILED: status=${res1.status}, enroll=${count1_after}, pay=${pay1_after}`)
        }
        console.log("TEST 1: PASS")

        // --- Test 2: order.paid for a valid order -> 200, enrolls ---
        console.log("\n--- TEST 2: order.paid (valid) ---")
        const payload2 = {
            event: "order.paid",
            payload: {
                order: {
                    entity: {
                        id: `order_p6_2_${timestamp}`,
                        amount: 329900,
                        currency: "INR",
                        notes: {
                            userId: users[1].id,
                            courseId: course.id,
                        },
                    },
                },
                payment: {
                    entity: {
                        id: `pay_p6_2_${timestamp}`,
                        order_id: `order_p6_2_${timestamp}`,
                        amount: 329900,
                        currency: "INR",
                        status: "captured",
                        method: "upi",
                        notes: {
                            userId: users[1].id,
                            courseId: course.id,
                        },
                    },
                },
            },
        }

        const count2_before = await prisma.enrollment.count({ where: { userId: users[1].id } })
        const res2 = await sendWebhook(payload2)
        const count2_after = await prisma.enrollment.count({ where: { userId: users[1].id } })
        const pay2_after = await prisma.payment.count({ where: { userId: users[1].id } })
        console.log("Status:", res2.status)
        console.log("Response:", JSON.stringify(res2.body))
        console.log(`Enrollment before: ${count2_before}, after: ${count2_after}`)
        console.log(`Payment records created: ${pay2_after}`)
        if (res2.status !== 200 || count2_after !== 1 || pay2_after !== 1) {
            throw new Error(`TEST 2 FAILED: status=${res2.status}, enroll=${count2_after}, pay=${pay2_after}`)
        }
        console.log("TEST 2: PASS")

        // --- Test 3: unknown event dummy.event -> 200, no enroll ---
        console.log("\n--- TEST 3: unknown event dummy.event ---")
        const payload3 = {
            event: "dummy.event",
            payload: {
                payment: {
                    entity: {
                        id: `pay_p6_3_${timestamp}`,
                        order_id: `order_p6_3_${timestamp}`,
                        amount: 329900,
                        notes: {
                            userId: users[2].id,
                            courseId: course.id,
                        },
                    },
                },
            },
        }

        const count3_before = await prisma.enrollment.count({ where: { userId: users[2].id } })
        const res3 = await sendWebhook(payload3)
        const count3_after = await prisma.enrollment.count({ where: { userId: users[2].id } })
        console.log("Status:", res3.status)
        console.log("Response:", JSON.stringify(res3.body))
        console.log(`Enrollment before: ${count3_before}, after: ${count3_after}`)
        if (res3.status !== 200 || count3_after !== 0) {
            throw new Error(`TEST 3 FAILED: status=${res3.status}, enroll=${count3_after}`)
        }
        console.log("TEST 3: PASS")

        // --- Test 4: payment.captured with mismatched amount -> rejected/not enrolled, status ---
        console.log("\n--- TEST 4: payment.captured with mismatched amount ---")
        const payload4 = {
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: `pay_p6_4_${timestamp}`,
                        order_id: `order_p6_4_${timestamp}`,
                        amount: 100, // 1 INR tampered payment
                        currency: "INR",
                        status: "captured",
                        method: "card",
                        notes: {
                            userId: users[3].id,
                            courseId: course.id,
                        },
                    },
                },
                order: {
                    entity: {
                        id: `order_p6_4_${timestamp}`,
                        amount: 329900, // Order expected 3299 INR
                        currency: "INR",
                        notes: {
                            userId: users[3].id,
                            courseId: course.id,
                        },
                    },
                },
            },
        }

        const count4_before = await prisma.enrollment.count({ where: { userId: users[3].id } })
        const res4 = await sendWebhook(payload4)
        const count4_after = await prisma.enrollment.count({ where: { userId: users[3].id } })
        const pay4_after = await prisma.payment.count({ where: { userId: users[3].id } })
        console.log("Status:", res4.status)
        console.log("Response:", JSON.stringify(res4.body))
        console.log(`Enrollment before: ${count4_before}, after: ${count4_after}`)
        console.log(`Payment records created: ${pay4_after}`)
        if (res4.status !== 200 || count4_after !== 0 || pay4_after !== 0) {
            throw new Error(`TEST 4 FAILED: status=${res4.status}, enroll=${count4_after}, pay=${pay4_after}`)
        }
        console.log("TEST 4: PASS (mismatched amount safely rejected without enrollment)")

        console.log("\nALL 4 WEBHOOK TESTS PASSED SUCCESSFULLY!")
    } finally {
        await cleanup()
        await prisma.$disconnect()
    }
}

main().catch((e) => {
    console.error("FATAL ERROR in webhook tests:", e)
    process.exit(1)
})
