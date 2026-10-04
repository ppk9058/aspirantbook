/**
 * Admin Script: Manage & Safely Delete Test Demo Slots
 *
 * Usage:
 *  1. List all slots:
 *     npx tsx scripts/admin-manage-demo-slots.ts --list
 *
 *  2. Dry run deletion of a slot:
 *     npx tsx scripts/admin-manage-demo-slots.ts --delete <slotId>
 *
 *  3. Confirmed deletion of a slot (cascades bookings & chat):
 *     npx tsx scripts/admin-manage-demo-slots.ts --delete <slotId> --confirm
 *
 *  4. Confirmed cleanup of all ENDED test slots:
 *     npx tsx scripts/admin-manage-demo-slots.ts --delete-ended-test-slots --confirm
 */

import { prisma } from "../lib/prisma"

const args = process.argv.slice(2)
const isConfirm = args.includes("--confirm")
const isList = args.includes("--list") || args.length === 0
const deleteIdx = args.indexOf("--delete")
const targetSlotId = deleteIdx !== -1 ? args[deleteIdx + 1] : null
const isDeleteEndedTest = args.includes("--delete-ended-test-slots")

async function main() {
  console.log("\n====================================================")
  console.log("  Demo Slot Admin Management & Cleanup Tool")
  console.log("====================================================\n")

  if (targetSlotId) {
    const slot = await prisma.demoSlot.findUnique({
      where: { id: targetSlotId },
      include: {
        course: { select: { slug: true, title: true } },
        _count: { select: { bookings: true, chatMessages: true } },
      },
    })

    if (!slot) {
      console.error(`❌ Slot not found with ID: ${targetSlotId}`)
      process.exit(1)
    }

    console.log(`Target Slot Details:`)
    console.log(`  ID: ${slot.id}`)
    console.log(`  Course: ${slot.course.title} (${slot.course.slug})`)
    console.log(`  Topic: ${slot.topic}`)
    console.log(`  Status: ${slot.status}`)
    console.log(`  Start Time: ${slot.startTime.toISOString()}`)
    console.log(`  Associated Bookings: ${slot._count.bookings}`)
    console.log(`  Associated Chat Messages: ${slot._count.chatMessages}`)

    if (!isConfirm) {
      console.log("\n⚠️  DRY RUN ONLY. No rows were deleted.")
      console.log("To permanently delete this slot, bookings, and chat rows, re-run with --confirm:")
      console.log(`  npx tsx scripts/admin-manage-demo-slots.ts --delete ${targetSlotId} --confirm\n`)
      process.exit(0)
    }

    console.log("\n🗑️  Executing cascade deletion in PostgreSQL...")
    await prisma.demoSlot.delete({
      where: { id: targetSlotId },
    })
    console.log(`✅ Successfully deleted slot ${targetSlotId} and all cascaded relations.\n`)
    process.exit(0)
  }

  if (isDeleteEndedTest) {
    const testSlots = await prisma.demoSlot.findMany({
      where: {
        status: "ENDED",
        OR: [
          { topic: { contains: "M4" } },
          { topic: { contains: "Test" } },
        ],
      },
      include: {
        _count: { select: { bookings: true, chatMessages: true } },
      },
    })

    console.log(`Found ${testSlots.length} ended test slots:`)
    for (const s of testSlots) {
      console.log(`  • [${s.id}] "${s.topic}" (${s._count.bookings} bookings, ${s._count.chatMessages} chats)`)
    }

    if (!isConfirm) {
      console.log("\n⚠️  DRY RUN ONLY. No rows were deleted.")
      console.log("To permanently delete all these ended test slots, re-run with --confirm:")
      console.log("  npx tsx scripts/admin-manage-demo-slots.ts --delete-ended-test-slots --confirm\n")
      process.exit(0)
    }

    const ids = testSlots.map((s) => s.id)
    await prisma.demoSlot.deleteMany({
      where: { id: { in: ids } },
    })
    console.log(`✅ Successfully deleted ${ids.length} ended test slots.\n`)
    process.exit(0)
  }

  // Default: list all slots
  const allSlots = await prisma.demoSlot.findMany({
    include: {
      course: { select: { slug: true, title: true } },
      _count: { select: { bookings: true, chatMessages: true } },
    },
    orderBy: { startTime: "asc" },
  })

  console.log(`Current Demo Slots in PostgreSQL (${allSlots.length} total):\n`)
  for (const s of allSlots) {
    const isLive = s.status === "LIVE"
    const isScheduled = s.status === "SCHEDULED"
    const statusIcon = isLive ? "🟢 LIVE" : isScheduled ? "🟡 SCHEDULED" : "⚪ ENDED"
    console.log(
      `${statusIcon.padEnd(16)} | ID: ${s.id} | ${s.startTime.toISOString()} | Bookings: ${s._count.bookings} | Chats: ${s._count.chatMessages} | "${s.topic}"`
    )
  }

  console.log("\nTo delete a slot: npx tsx scripts/admin-manage-demo-slots.ts --delete <slotId> --confirm\n")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
