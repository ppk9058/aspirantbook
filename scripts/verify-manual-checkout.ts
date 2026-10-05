/**
 * Verification Script for Manual Razorpay Checkout & Webhook Processing
 *
 * Usage:
 *   npx tsx scripts/verify-manual-checkout.ts [userId]
 *
 * Prints:
 *   - Latest Payment row (masked)
 *   - Latest Enrollment row (masked)
 *   - Latency between Order/Payment creation and Enrollment
 *   - Required Razorpay Dashboard Webhook Configuration
 *   - Manual verification criteria checklist
 */

import { prisma } from "../lib/prisma"

function mask(str: string | null | undefined, visibleCount = 6): string {
  if (!str) return "N/A"
  if (str.length <= visibleCount) return str
  return `${str.slice(0, visibleCount)}...${str.slice(-4)}`
}

async function main() {
  const targetUserId = process.argv[2]?.trim()

  console.log("=================================================================")
  console.log("      RAZORPAY MANUAL CHECKOUT & WEBHOOK VERIFICATION            ")
  console.log("=================================================================\n")

  let user = null
  if (targetUserId) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetUserId },
          { id: { startsWith: targetUserId } }
        ]
      }
    })
  } else {
    // Pick user with most recent payment or enrollment
    const latestPayment = await prisma.payment.findFirst({
      orderBy: { createdAt: "desc" },
      select: { userId: true }
    })
    if (latestPayment?.userId) {
      user = await prisma.user.findUnique({ where: { id: latestPayment.userId } })
    }
  }

  if (!user) {
    console.log("No user found. Please provide a valid user ID as argument:")
    console.log("  npx tsx scripts/verify-manual-checkout.ts <userId>\n")
    printDashboardInstructions()
    return
  }

  console.log(`[User] ID: ${mask(user.id)} | Role: ${user.role} | Created: ${user.createdAt.toISOString()}`)

  // 1. Latest Payment
  const latestPayment = await prisma.payment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  })

  console.log("\n--- LATEST PAYMENT ROW ---")
  if (latestPayment) {
    console.log(`  Payment ID     : ${mask(latestPayment.id)}`)
    console.log(`  External ID    : ${mask(latestPayment.externalId)}`)
    console.log(`  Status         : ${latestPayment.status}`)
    console.log(`  Amount         : ₹${latestPayment.amount} ${latestPayment.currency}`)
    console.log(`  Method         : ${latestPayment.paymentMethod || "card"}`)
    console.log(`  Created At     : ${latestPayment.createdAt.toISOString()}`)
    console.log(`  Coupon Code    : ${(latestPayment as any).couponCode || "None"}`)
    console.log(`  Discount Amount: ₹${(latestPayment as any).discountAmount || 0}`)
  } else {
    console.log("  No payment rows found for this user.")
  }

  // 2. Latest Enrollment
  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id },
    include: { course: { select: { id: true, title: true, slug: true } } },
    orderBy: { enrolledAt: "desc" }
  })

  console.log("\n--- LATEST ENROLLMENT ROW ---")
  if (latestEnrollment) {
    console.log(`  Enrollment ID  : ${mask(latestEnrollment.id)}`)
    console.log(`  Course Title   : ${latestEnrollment.course.title}`)
    console.log(`  Course Slug    : ${latestEnrollment.course.slug}`)
    console.log(`  Enrolled At    : ${latestEnrollment.enrolledAt.toISOString()}`)
  } else {
    console.log("  No enrollment rows found for this user.")
  }

  // 3. Latency
  if (latestPayment && latestEnrollment) {
    const diffMs = Math.abs(latestEnrollment.enrolledAt.getTime() - latestPayment.createdAt.getTime())
    console.log(`\n--- FULFILLMENT LATENCY ---`)
    console.log(`  Payment -> Enrollment: ${diffMs} ms (${(diffMs / 1000).toFixed(2)} s)`)
  }

  printDashboardInstructions()
}

function printDashboardInstructions() {
  console.log("\n=================================================================")
  console.log("       RAZORPAY DASHBOARD WEBHOOK CONFIGURATION GUIDELINES       ")
  console.log("=================================================================")
  console.log("Configure the webhook in Razorpay Dashboard -> Settings -> Webhooks:\n")
  console.log("  1. Webhook URL : https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/razorpay")
  console.log("     (For local testing: use ngrok or Cloudflare tunnel to port 3000)")
  console.log("  2. Secret      : Paste secret into .env.local -> RAZORPAY_WEBHOOK_SECRET")
  console.log("  3. Active Events:")
  console.log("     - payment.captured")
  console.log("     - order.paid")
  console.log("  4. Alert Email : ops/admin notification email\n")
  console.log("=================================================================")
  console.log("       MANUAL PAYMENT TEST CRITERIA CHECKLIST                   ")
  console.log("=================================================================")
  console.log("  [ ] 1. Card Payment with Razorpay test card in checkout")
  console.log("  [ ] 2. Redirect to /my-learning (My Batches) in <= 2 seconds")
  console.log("  [ ] 3. Entry recorded in /purchases with COMPLETED status")
  console.log("  [ ] 4. Course appears in My Batches enrolled list with full unlocked access")
  console.log("=================================================================\n")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification script failed:", err)
    process.exit(1)
  })
