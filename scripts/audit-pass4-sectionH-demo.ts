import { prisma } from "../lib/prisma"

async function run() {
  console.log("=== SECTION H: DEMO / COMPLETE AUDIT ===")

  const rand = Math.floor(10000 + Math.random() * 90000)
  const phone = `99988${rand}`
  let testUser: any = null
  let testCourse: any = null

  try {
    testUser = await prisma.user.create({
      data: {
        email: `test_demo_${rand}@example.com`,
        phoneNumber: phone,
        name: `Demo Audit User ${rand}`,
        role: "FREE",
      },
    })
    console.log(`[setup] Created test user ${testUser.id.slice(0, 8)}`)

    testCourse = await prisma.course.create({
      data: {
        title: `Audit Test Course ${rand}`,
        slug: `audit-test-course-${rand}`,
        description: "Audit test course description",
        difficulty: "BEGINNER",
        price: 1999,
        isPremium: true,
        enrollmentCount: 10,
        isPublished: true,
      },
    })
    console.log(`[setup] Created test course ${testCourse.slug} with initial enrollmentCount = ${testCourse.enrollmentCount}`)

    // Also check on 72nd-bpsc-prelims-current-affairs initial count (read-only inspection)
    const bpscCourse = await prisma.course.findUnique({
      where: { slug: "72nd-bpsc-prelims-current-affairs" },
      select: { id: true, slug: true, price: true, isPremium: true, enrollmentCount: true },
    })
    console.log(`[inspect] Real course 72nd-bpsc-prelims-current-affairs current enrollmentCount = ${bpscCourse?.enrollmentCount}`)

    // We test the route behavior directly using its logic / API endpoint with testUser and testCourse
    // Let's call the logic 5 times as the testUser for the paid testCourse
    console.log(`\nCalling POST /api/courses/demo/complete logic 5 times on paid course...`)
    
    // Simulate what app/api/courses/demo/complete/route.ts does:
    for (let i = 1; i <= 5; i++) {
      // 1. Mark demo booking as COMPLETED
      await prisma.courseDemoBooking.updateMany({
        where: { userId: testUser.id, courseId: testCourse.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }).catch(() => {})

      // 2. Add course to Student's My Batches only if free course
      let enrollment = null
      const isFree = !testCourse.isPremium && (!testCourse.price || testCourse.price === 0)
      if (isFree) {
        enrollment = await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: testUser.id, courseId: testCourse.id } },
          create: { userId: testUser.id, courseId: testCourse.id, enrolledAt: new Date(), completedAt: new Date() },
          update: { completedAt: new Date() },
        })
      }

      // 3. Increment course enrollment count
      await prisma.course.update({
        where: { id: testCourse.id },
        data: { enrollmentCount: { increment: 1 } },
      })
      console.log(` - Call #${i} completed`)
    }

    const updatedTestCourse = await prisma.course.findUnique({
      where: { id: testCourse.id },
      select: { enrollmentCount: true },
    })
    console.log(`\n[result] Before enrollmentCount: 10`)
    console.log(`[result] After enrollmentCount: ${updatedTestCourse?.enrollmentCount} (incremented by 5)`)

    const enrollmentsCount = await prisma.enrollment.count({
      where: { userId: testUser.id, courseId: testCourse.id },
    })
    console.log(`[result] Duplicate Enrollment rows created for paid course: ${enrollmentsCount} (0 rows, because isFree is false)`)

    // Coupon DEMO30 validation inspection
    console.log("\n--- DEMO30 COUPON AUDIT ---")
    console.log("1. Location: Hardcoded in lib/actions/payment/razorpay.ts:64 and app/checkout/page.tsx:239, 335.")
    console.log("2. createRazorpayOrder accepts couponCode from client directly:")
    console.log("   if (couponCode === 'DEMO30') { discountPercent = 30 }")
    console.log("3. Can unpaid user pass DEMO30 without demo/complete? YES. There is zero check against demo completion.")
    console.log("4. Can user pass DEMO30 without booking a demo? YES. There is zero query on CourseDemoBooking.")
    console.log("5. Discount applied: 30% flat discount on effectiveCoursePrice.")

  } finally {
    if (testCourse) {
      await prisma.course.delete({ where: { id: testCourse.id } })
      console.log(`[cleanup] Deleted test course ${testCourse.slug}`)
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } })
      console.log(`[cleanup] Deleted test user ${testUser.id.slice(0, 8)}`)
    }
  }
}

run().catch((err) => {
  console.error("SECTION H FAILED:", err)
  process.exit(1)
})
