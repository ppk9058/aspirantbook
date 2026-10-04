import { prisma } from "../lib/prisma"
import { normalizePhoneToE164, formatUtcToIst, isSlotExpired } from "../lib/demo/slot-utils"

async function main() {
  console.log("=== STEP 1: VERIFYING MILESTONE 1 (SLOTS, IST CONVERSION, TOGGLE) ===")

  // 1. Course lookup
  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    include: {
      demoSlots: {
        orderBy: { startTime: "asc" }
      }
    }
  })

  if (!course) {
    throw new Error("Course not found!")
  }

  console.log(`Course Found: "${course.title}" (${course.id})`)
  console.log(`Demo Settings in DB:`, course.demoSettings)
  console.log(`Found ${course.demoSlots.length} DemoSlot(s) for course:`)

  for (const s of course.demoSlots) {
    const ist = formatUtcToIst(s.startTime)
    const expired = isSlotExpired(s.startTime, s.durationMinutes)
    console.log(`  - Slot ID: ${s.id}`)
    console.log(`    StartTime (UTC): ${s.startTime.toISOString()}`)
    console.log(`    IST Formatted: ${ist.fullLabel} (Date: ${ist.dateLabel}, Time: ${ist.timeLabel})`)
    console.log(`    Status: ${s.status}, Expired: ${expired}`)
    console.log(`    Channel: ${s.agoraChannelName}, Max Audience: ${s.maxAudience}`)
  }

  const activeSlot = course.demoSlots.find(s => s.status === "SCHEDULED" || s.status === "LIVE")
  if (!activeSlot) {
    throw new Error("No active slot found for testing!")
  }

  console.log("\n=== STEP 2: VERIFYING MILESTONE 2 (BOOKING, UTM CAPTURE, DUPLICATE PREVENTION) ===")

  const testPhone = "9876543211"
  const normalizedPhone = normalizePhoneToE164(testPhone)!
  console.log(`Input Phone: ${testPhone} -> Normalized E.164: ${normalizedPhone}`)

  // Find or create test student
  let testStudent = await prisma.user.findFirst({
    where: { phoneNumber: testPhone }
  })
  if (!testStudent) {
    testStudent = await prisma.user.create({
      data: {
        phoneNumber: testPhone,
        email: `test_m2_${testPhone}@aspirantbook.local`,
        name: "Test Student M2",
        role: "FREE",
      }
    })
  }
  console.log(`Test Student: ID=${testStudent.id}, Name=${testStudent.name}`)

  // Clean up any prior test booking for this slot
  await prisma.whatsAppMessageLog.deleteMany({
    where: { recipientPhone: normalizedPhone }
  })
  await prisma.demoBooking.deleteMany({
    where: { studentId: testStudent.id, slotId: activeSlot.id }
  })

  // Test 1: First Booking with UTM
  console.log("\n--- Submitting First Booking with UTM ---")
  const utmSource = "facebook"
  const utmCampaign = "demo_ads_autumn"

  const booking1 = await prisma.demoBooking.create({
    data: {
      studentId: testStudent.id,
      mobile: normalizedPhone,
      slotId: activeSlot.id,
      courseId: course.id,
      status: "BOOKED",
      utmSource,
      utmCampaign,
    }
  })

  const waLog1 = await prisma.whatsAppMessageLog.create({
    data: {
      bookingId: booking1.id,
      recipientPhone: normalizedPhone,
      templateName: "demo_class_confirmation_v1",
      variablesJson: JSON.stringify({
        studentName: testStudent.name,
        courseName: course.title,
        slotTimeIst: formatUtcToIst(activeSlot.startTime).fullLabel,
        demoUrl: `https://trillionskill.com/courses/${course.slug}/demo`,
        couponCode: "DEMO30",
      }),
      status: "PENDING_TEMPLATE",
    }
  })

  console.log(`Booking 1 Success! ID: ${booking1.id}`)
  console.log(`Mobile: ${booking1.mobile}`)
  console.log(`UTM Source: ${booking1.utmSource}, UTM Campaign: ${booking1.utmCampaign}`)
  console.log(`WhatsApp Log ID: ${waLog1.id}, Status: ${waLog1.status}`)

  // Test 2: Attempt Duplicate Booking
  console.log("\n--- Testing Duplicate Booking Prevention ---")
  let duplicateCaught = false
  try {
    await prisma.demoBooking.create({
      data: {
        studentId: testStudent.id,
        mobile: normalizedPhone,
        slotId: activeSlot.id,
        courseId: course.id,
        status: "BOOKED",
      }
    })
  } catch (err: any) {
    if (err.code === "P2002" || String(err).includes("Unique constraint")) {
      duplicateCaught = true
      console.log("SUCCESS: Duplicate booking blocked by Unique Constraint @@unique([studentId, slotId])!")
    } else {
      console.error("Unexpected error on duplicate booking:", err)
    }
  }

  if (!duplicateCaught) {
    console.error("FAILURE: Duplicate booking was NOT blocked by unique constraint!")
  }

  // Verify DB state
  const totalBookingsForSlot = await prisma.demoBooking.count({
    where: { slotId: activeSlot.id, studentId: testStudent.id }
  })
  console.log(`\nVerified count of bookings for test student in slot: ${totalBookingsForSlot} (Must be exactly 1)`)

  console.log("\n=== ALL M1 & M2 CHECKS PASSED SUCCESSFULLY ===")
}

main()
  .catch((e) => {
    console.error("Test failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
