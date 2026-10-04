/**
 * Safe Demo Test Data Purge Script
 * Usage:
 *   npx tsx scripts/purge-demo-test-data.ts           (Dry-Run by default: lists all matching test rows without deleting)
 *   npx tsx scripts/purge-demo-test-data.ts --confirm (Deletes test rows ONLY after explicit flag)
 */

import { prisma } from "../lib/prisma"

const TEST_TOPIC_PATTERNS = [
  "test",
  "m4",
  "security",
  "stage",
  "proof",
  "isolated",
  "strategy & current affairs breakdown", // test slots generated during automation
  "masterclass & answer writing",
]

async function purgeTestData() {
  const isConfirm = process.argv.includes("--confirm")

  console.log("\n========================================================")
  console.log(isConfirm ? "🚨 EXECUTING DEMO TEST DATA PURGE (--confirm)" : "🔍 DRY RUN: DEMO TEST DATA SCAN (No deletions)")
  console.log("========================================================\n")

  // 1. Scan for test slots
  const allSlots = await prisma.demoSlot.findMany({
    include: {
      course: { select: { slug: true, title: true } },
      _count: {
        select: {
          bookings: true,
          chatMessages: true,
          stageSessions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Identify test slots based on topic or channel name or test mobiles
  const testSlots = allSlots.filter((slot) => {
    const topicLower = slot.topic.toLowerCase()
    const channelLower = slot.agoraChannelName.toLowerCase()
    return (
      TEST_TOPIC_PATTERNS.some((pat) => topicLower.includes(pat) || channelLower.includes(pat)) ||
      channelLower.startsWith("sec_") ||
      channelLower.startsWith("stage_") ||
      channelLower.startsWith("demo_m4_")
    )
  })

  const testSlotIds = testSlots.map((s) => s.id)

  // 2. Scan for bookings associated with test slots or test student phones
  const testBookings = await prisma.demoBooking.findMany({
    where: {
      OR: [
        { slotId: { in: testSlotIds } },
        { mobile: { in: ["9800000001", "9800000002", "9800000003", "+919999900001", "+919999900002", "+919999900003"] } },
      ],
    },
    include: {
      student: { select: { id: true, name: true, phoneNumber: true } },
      slot: { select: { topic: true } },
    },
  })

  // 3. Scan for chat messages in test slots
  const testChatMessages = await prisma.demoChatMessage.findMany({
    where: { slotId: { in: testSlotIds } },
  })

  // 4. Scan for stage sessions in test slots
  const testStageSessions = await prisma.demoStageSession.findMany({
    where: { slotId: { in: testSlotIds } },
  })

  console.log(`Identified Test Entities:`)
  console.log(`  - Test Demo Slots:         ${testSlots.length} slots`)
  console.log(`  - Test Bookings:           ${testBookings.length} bookings`)
  console.log(`  - Test Chat Messages:      ${testChatMessages.length} messages`)
  console.log(`  - Test Stage Sessions:     ${testStageSessions.length} sessions\n`)

  console.log("Detailed Test Slots:")
  testSlots.forEach((s, idx) => {
    console.log(
      `  [${idx + 1}] ID: ${s.id} | Topic: "${s.topic}" | Status: ${s.status} | Channel: ${s.agoraChannelName} | Bookings: ${s._count.bookings}`
    )
  })

  console.log("\nDetailed Test Bookings:")
  testBookings.forEach((b, idx) => {
    console.log(
      `  [${idx + 1}] ID: ${b.id} | Student: ${b.student.name || "N/A"} (${b.mobile}) | Slot: "${b.slot?.topic || b.slotId}" | Status: ${b.status} | UTM: ${b.utmSource || "direct"}`
    )
  })

  if (!isConfirm) {
    console.log("\n--------------------------------------------------------")
    console.log("DRY RUN COMPLETE. Zero database rows were modified.")
    console.log("To permanently delete these test records, re-run with:")
    console.log("  npx tsx scripts/purge-demo-test-data.ts --confirm")
    console.log("--------------------------------------------------------\n")
    return
  }

  // If confirmed, proceed with safe deletion in foreign-key order
  console.log("\nExecuting deletion in PostgreSQL...")

  const stageDel = await prisma.demoStageSession.deleteMany({
    where: { slotId: { in: testSlotIds } },
  })
  console.log(`✓ Deleted ${stageDel.count} test stage sessions.`)

  const chatDel = await prisma.demoChatMessage.deleteMany({
    where: { slotId: { in: testSlotIds } },
  })
  console.log(`✓ Deleted ${chatDel.count} test chat messages.`)

  const bookingDel = await prisma.demoBooking.deleteMany({
    where: {
      OR: [
        { slotId: { in: testSlotIds } },
        { id: { in: testBookings.map((b) => b.id) } },
      ],
    },
  })
  console.log(`✓ Deleted ${bookingDel.count} test bookings.`)

  const slotDel = await prisma.demoSlot.deleteMany({
    where: { id: { in: testSlotIds } },
  })
  console.log(`✓ Deleted ${slotDel.count} test slots.`)

  console.log("\n========================================================")
  console.log("  PURGE COMPLETED SUCCESSFULLY. Database is clean.       ")
  console.log("========================================================\n")
}

purgeTestData().catch((err) => {
  console.error("Purge script error:", err)
  process.exit(1)
})
