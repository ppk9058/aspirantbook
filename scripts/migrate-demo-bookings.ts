import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting safe migration of CourseDemoBooking -> DemoSlot + DemoBooking...")

  const existingBookings = await prisma.courseDemoBooking.findMany()
  console.log(`Found ${existingBookings.length} existing booking(s) to migrate.`)

  for (const oldBooking of existingBookings) {
    // 1. Resolve or create a DemoSlot for this course
    let slot = await prisma.demoSlot.findFirst({
      where: { courseId: oldBooking.courseId },
      orderBy: { startTime: "asc" },
    })

    if (!slot) {
      // Default to today 18:00 IST (12:30 UTC) or tomorrow
      const now = new Date()
      const defaultStartTime = new Date(now)
      defaultStartTime.setUTCHours(12, 30, 0, 0) // 18:00 IST
      if (defaultStartTime < now) {
        defaultStartTime.setDate(defaultStartTime.getDate() + 1)
      }

      slot = await prisma.demoSlot.create({
        data: {
          courseId: oldBooking.courseId,
          startTime: defaultStartTime,
          durationMinutes: 60,
          topic: "72nd BPSC Prelims Strategy & Trend Analysis",
          facultyName: "Prof. Rajesh Sharma",
          agoraChannelName: `demo_slot_${oldBooking.courseId.slice(-8)}_${Date.now()}`,
          maxAudience: 100,
          status: "SCHEDULED",
        },
      })
      console.log(`Created new DemoSlot: ${slot.id} for course ${oldBooking.courseId}`)
    }

    // 2. Normalize phone to E.164 (+91XXXXXXXXXX)
    const rawDigits = oldBooking.phoneNumber.replace(/\D/g, "")
    const mobile = rawDigits.startsWith("91") && rawDigits.length === 12
      ? `+${rawDigits}`
      : `+91${rawDigits.slice(-10)}`

    // 3. Upsert DemoBooking
    await prisma.demoBooking.upsert({
      where: {
        studentId_slotId: {
          studentId: oldBooking.userId,
          slotId: slot.id,
        },
      },
      create: {
        id: oldBooking.id,
        studentId: oldBooking.userId,
        slotId: slot.id,
        courseId: oldBooking.courseId,
        mobile,
        status: oldBooking.status === "COMPLETED" ? "ATTENDED" : "BOOKED",
        joinedAt: oldBooking.joinedAt,
        createdAt: oldBooking.createdAt,
        updatedAt: oldBooking.updatedAt,
      },
      update: {
        mobile,
        status: oldBooking.status === "COMPLETED" ? "ATTENDED" : "BOOKED",
      },
    })
    console.log(`Migrated booking ${oldBooking.id} -> DemoBooking with student ${oldBooking.userId}`)
  }

  const migratedCount = await prisma.demoBooking.count()
  const slotCount = await prisma.demoSlot.count()
  console.log(`Migration completed successfully! DemoSlots: ${slotCount}, DemoBookings: ${migratedCount}`)
}

main()
  .catch((e) => {
    console.error("Migration error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
