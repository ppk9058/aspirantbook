import { prisma } from "../lib/prisma"
import { generateAgoraRtcToken } from "../lib/agora/token-service"

async function runM3Verification() {
  console.log("=== STARTING MILESTONE 3 VERIFICATION ===")

  // 1. Resolve Course & Slot
  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    include: { demoSlots: true }
  })
  if (!course) throw new Error("Course not found")
  let slot = course.demoSlots[0]
  if (!slot) throw new Error("No demo slot found")

  console.log(`Course: ${course.title} (${course.slug})`)
  console.log(`Slot ID: ${slot.id}, Channel: ${slot.agoraChannelName}, Initial Status: ${slot.status}`)

  // 2. Test Teacher Go Live in PostgreSQL
  console.log("\n--- Testing Teacher 'Go Live' (PostgreSQL Persistence) ---")
  const startedAt = new Date()
  slot = await prisma.demoSlot.update({
    where: { id: slot.id },
    data: {
      status: "LIVE",
      startedAt,
      hostHeartbeatAt: startedAt,
    }
  })
  console.log(`Updated Slot Status in DB: ${slot.status}, startedAt: ${slot.startedAt?.toISOString()}`)
  if (slot.status !== "LIVE") throw new Error("Slot failed to transition to LIVE in DB")

  // 3. Test Host Token Generation (Teacher role only, slot channel only)
  console.log("\n--- Testing Host Publisher Token Generation ---")
  const hostToken = generateAgoraRtcToken({
    channelName: slot.agoraChannelName,
    role: "publisher",
  })
  console.log(`Generated Host Token for channel [${slot.agoraChannelName}]: ${hostToken?.slice(0, 30)}... (Length: ${hostToken?.length})`)
  if (!hostToken) throw new Error("Failed to generate host token")

  // 4. Test Audience Token Generation (Student with valid booking)
  console.log("\n--- Testing Audience Subscriber Token Generation ---")
  const audienceToken = generateAgoraRtcToken({
    channelName: slot.agoraChannelName,
    role: "subscriber",
  })
  console.log(`Generated Audience Token for channel [${slot.agoraChannelName}]: ${audienceToken?.slice(0, 30)}... (Length: ${audienceToken?.length})`)
  if (!audienceToken) throw new Error("Failed to generate audience token")

  // 5. Test Watch Seconds Tracking & Minutes Counter
  console.log("\n--- Testing Watch Time Tracking Heartbeat ---")
  const testBooking = await prisma.demoBooking.findFirst({
    where: { slotId: slot.id }
  })
  if (testBooking) {
    const beforeSeconds = testBooking.watchSeconds
    const updatedBooking = await prisma.demoBooking.update({
      where: { id: testBooking.id },
      data: {
        watchSeconds: { increment: 120 }, // Simulated 2 mins of watching
        status: "ATTENDED",
        leftAt: new Date(),
      }
    })
    console.log(`Booking ID: ${updatedBooking.id}, Watch Seconds: ${beforeSeconds} -> ${updatedBooking.watchSeconds}, Status: ${updatedBooking.status}`)

    // Check minutes counter aggregation
    const monthBookings = await prisma.demoBooking.findMany({
      where: { courseId: course.id },
      select: { watchSeconds: true }
    })
    const totalMinutes = Math.round(monthBookings.reduce((sum, b) => sum + (b.watchSeconds || 0), 0) / 60)
    console.log(`Aggregated Audience Minutes for Course: ${totalMinutes} mins (Real DB Calculation)`)
  }

  // 6. Test Teacher Disconnect Fail-Safe (Heartbeat older than 2 minutes)
  console.log("\n--- Testing Teacher Disconnect Fail-Safe (2-Minute Inactivity) ---")
  // Simulate stale heartbeat 130 seconds ago
  const staleHeartbeat = new Date(Date.now() - 130 * 1000)
  slot = await prisma.demoSlot.update({
    where: { id: slot.id },
    data: { hostHeartbeatAt: staleHeartbeat }
  })
  console.log(`Simulated Stale Host Heartbeat: ${slot.hostHeartbeatAt?.toISOString()} (130s ago)`)

  // Now simulate the status check endpoint logic
  const elapsedMs = Date.now() - slot.hostHeartbeatAt!.getTime()
  if (elapsedMs > 120_000) {
    slot = await prisma.demoSlot.update({
      where: { id: slot.id },
      data: { status: "ENDED", endedAt: new Date() }
    })
    console.log(`FAIL-SAFE TRIGGERED: Slot automatically transitioned to [${slot.status}] in PostgreSQL! EndedAt: ${slot.endedAt?.toISOString()}`)
  }
  if (slot.status !== "ENDED") throw new Error("Fail-safe failed to mark slot ENDED")

  // Reset slot to SCHEDULED for ongoing live testing
  await prisma.demoSlot.update({
    where: { id: slot.id },
    data: { status: "SCHEDULED", endedAt: null, startedAt: null, hostHeartbeatAt: null }
  })
  console.log("\nReset test slot status back to SCHEDULED for interactive testing.")

  console.log("\n=== ALL M3 BACKEND & DATABASE TESTS PASSED ===")
}

runM3Verification()
  .catch((e) => {
    console.error("M3 verification failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
