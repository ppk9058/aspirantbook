import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function runSecurityTests() {
  console.log("====================================================")
  console.log("  Stage Feature Security & Role Verification Suite  ")
  console.log("====================================================")

  // 1. Resolve Course & Create 2 Test Slots
  const course = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
  })

  if (!course) {
    throw new Error("Course not found")
  }

  const now = new Date()
  const slotX = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: new Date(now.getTime() + 3600000),
      durationMinutes: 60,
      topic: "Security Test Slot X",
      facultyName: "Prof. Test",
      agoraChannelName: `sec_slot_x_${Date.now()}`,
      maxAudience: 50,
      maxOnStage: 1,
      status: "LIVE",
      startedAt: now,
      hostHeartbeatAt: now,
    },
  })

  const slotY = await prisma.demoSlot.create({
    data: {
      courseId: course.id,
      startTime: new Date(now.getTime() + 7200000),
      durationMinutes: 60,
      topic: "Security Test Slot Y",
      facultyName: "Prof. Test",
      agoraChannelName: `sec_slot_y_${Date.now()}`,
      maxAudience: 50,
      maxOnStage: 1,
      status: "LIVE",
      startedAt: now,
      hostHeartbeatAt: now,
    },
  })

  // 2. Create Test Users: Student 1, Student 2, Teacher with isolated identifiers
  const runId = Date.now()
  const phone1 = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
  const phone2 = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
  const phone3 = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`
  const student1 = await prisma.user.create({
    data: {
      email: `student1_sec_${runId}@internal.test`,
      phoneNumber: phone1,
      name: "Security Student One",
      role: "FREE",
    },
  })

  const student2 = await prisma.user.create({
    data: {
      email: `student2_sec_${runId}@internal.test`,
      phoneNumber: phone2,
      name: "Security Student Two",
      role: "FREE",
    },
  })

  const teacher = await prisma.user.create({
    data: {
      email: `teacher_sec_${runId}@internal.test`,
      phoneNumber: phone3,
      name: "Security Teacher",
      role: "TEACHER",
    },
  })

  // 3. Create Bookings
  const booking1X = await prisma.demoBooking.upsert({
    where: { studentId_slotId: { studentId: student1.id, slotId: slotX.id } },
    create: {
      studentId: student1.id,
      slotId: slotX.id,
      courseId: course.id,
      mobile: student1.phoneNumber!,
      status: "JOINED",
    },
    update: { status: "JOINED" },
  })

  const booking2X = await prisma.demoBooking.upsert({
    where: { studentId_slotId: { studentId: student2.id, slotId: slotX.id } },
    create: {
      studentId: student2.id,
      slotId: slotX.id,
      courseId: course.id,
      mobile: student2.phoneNumber!,
      status: "JOINED",
    },
    update: { status: "JOINED" },
  })

  // Helper to make NextAuth mock sessions
  // We can test the token and stage API endpoints directly or via HTTP
  const baseUrl = "http://localhost:3000"

  console.log("\n[TEST 1] Student WITHOUT an invite requests publisher token:")
  // Create an invited session for someone else, but student1 doesn't have one
  const fakeSessionId = "non_existent_or_uninvited_id"
  // Let's create an actual stageSession for student 1 in slot X
  const stageSession1X = await prisma.demoStageSession.create({
    data: {
      slotId: slotX.id,
      userId: student1.id,
      bookingId: booking1X.id,
      status: "INVITED", // NOT YET ACCEPTED
      mode: "VIDEO_AUDIO",
    },
  })

  // Direct endpoint test for stage/token
  // When status is INVITED (not ACCEPTED/ON_STAGE), should be blocked (403)
  console.log("Checking token issuance while session status is INVITED (pre-acceptance)...")
  const { POST: tokenPost } = await import("../app/api/courses/demo/stage/token/route")
  const { NextRequest } = await import("next/server")

  // Mock NextAuth session for student1
  const mockAuth = await import("@/auth")
  const originalAuth = mockAuth.auth
  ;(mockAuth as any).auth = async () => ({
    user: { id: student1.id, role: "STUDENT", phoneNumber: student1.phoneNumber },
  })

  const req1 = new NextRequest(`${baseUrl}/api/courses/demo/stage/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId: slotX.id, sessionId: stageSession1X.id }),
  })

  const res1 = await tokenPost(req1)
  const data1 = await res1.json()
  console.log(`Response Status: ${res1.status}, Error: "${data1.error}"`)
  if (res1.status === 403) {
    console.log("✅ PASS: Student with INVITED session refused publisher token (403 Forbidden).")
  } else {
    throw new Error(`FAIL: Expected 403, got ${res1.status}`)
  }

  console.log("\n[TEST 2] Student invited for Slot X requests publisher token for Slot Y:")
  const req2 = new NextRequest(`${baseUrl}/api/courses/demo/stage/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId: slotY.id, sessionId: stageSession1X.id }),
  })
  const res2 = await tokenPost(req2)
  const data2 = await res2.json()
  console.log(`Response Status: ${res2.status}, Error: "${data2.error}"`)
  if (res2.status === 403) {
    console.log("✅ PASS: Student invited for Slot X cannot get publisher token for Slot Y (403 Forbidden).")
  } else {
    throw new Error(`FAIL: Expected 403, got ${res2.status}`)
  }

  console.log("\n[TEST 3] Student removed by teacher (status = REMOVED) cannot renew/request token:")
  await prisma.demoStageSession.update({
    where: { id: stageSession1X.id },
    data: { status: "REMOVED", endedAt: new Date() },
  })

  const req3 = new NextRequest(`${baseUrl}/api/courses/demo/stage/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId: slotX.id, sessionId: stageSession1X.id }),
  })
  const res3 = await tokenPost(req3)
  const data3 = await res3.json()
  console.log(`Response Status: ${res3.status}, Error: "${data3.error}"`)
  if (res3.status === 403) {
    console.log("✅ PASS: Student with REMOVED status refused renewal token (403 Forbidden).")
  } else {
    throw new Error(`FAIL: Expected 403, got ${res3.status}`)
  }

  console.log("\n[TEST 4] Non-teacher student attempts to call teacher-only action (invite):")
  const { POST: stagePost } = await import("../app/api/courses/demo/stage/route")
  const req4 = new NextRequest(`${baseUrl}/api/courses/demo/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "invite", slotId: slotX.id, studentId: student2.id }),
  })
  const res4 = await stagePost(req4)
  const data4 = await res4.json()
  console.log(`Response Status: ${res4.status}, Error: "${data4.error}"`)
  if (res4.status === 403) {
    console.log("✅ PASS: Student cannot invite another student (403 Forbidden).")
  } else {
    throw new Error(`FAIL: Expected 403, got ${res4.status}`)
  }

  console.log("\n[TEST 5] Teacher enforces maxOnStage server-side capacity:")
  // Switch mock session to teacher
  ;(mockAuth as any).auth = async () => ({
    user: { id: teacher.id, role: "TEACHER", name: "Prof. Teacher" },
  })

  // Put student 1 on stage
  const session1Active = await prisma.demoStageSession.create({
    data: {
      slotId: slotX.id,
      userId: student1.id,
      bookingId: booking1X.id,
      status: "ON_STAGE",
      mode: "VIDEO_AUDIO",
      startedAt: new Date(),
    },
  })

  // Now slotX has maxOnStage = 1, and 1 user is already ON_STAGE.
  // Teacher tries to invite student 2:
  const req5 = new NextRequest(`${baseUrl}/api/courses/demo/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "invite", slotId: slotX.id, studentId: student2.id }),
  })
  const res5 = await stagePost(req5)
  const data5 = await res5.json()
  console.log(`Response Status: ${res5.status}, Error: "${data5.error}"`)
  if (res5.status === 409) {
    console.log("✅ PASS: Server enforces maxOnStage capacity limit (409 Conflict).")
  } else {
    throw new Error(`FAIL: Expected 409, got ${res5.status}`)
  }

  // Restore auth
  ;(mockAuth as any).auth = originalAuth

  // Cleanup test slots
  await prisma.demoStageSession.deleteMany({ where: { slotId: { in: [slotX.id, slotY.id] } } })
  await prisma.demoBooking.deleteMany({ where: { slotId: { in: [slotX.id, slotY.id] } } })
  await prisma.demoSlot.deleteMany({ where: { id: { in: [slotX.id, slotY.id] } } })

  console.log("\n====================================================")
  console.log("  ALL 5 SECURITY & ROLE TESTS PASSED 100%           ")
  console.log("====================================================")
}

runSecurityTests().catch((e) => {
  console.error(e)
  process.exit(1)
})
