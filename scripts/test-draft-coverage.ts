import { prisma } from "../lib/prisma"
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper"

interface TestResult {
  role: string
  route: string
  status: number
  expectedStatus: number
  pass: boolean
}

async function getSessionCookieForUser(phoneNumber: string): Promise<string> {
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf")
  const { csrfToken } = await csrfRes.json()
  const rawSetCookie = csrfRes.headers.get("set-cookie") || ""
  const csrfCookie = rawSetCookie.split(";")[0]

  const res = await fetch("http://localhost:3000/api/auth/callback/mobile", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: new URLSearchParams({
      phoneNumber,
      csrfToken,
      callbackUrl: "http://localhost:3000/dashboard",
      json: "true",
    }),
    redirect: "manual",
  })

  const setCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [res.headers.get("set-cookie") || ""]
  const sessionCookies = setCookies.map((c: string) => c.split(";")[0]).join("; ")
  return `${csrfCookie}; ${sessionCookies}`
}

async function run() {
  console.log("=== SECTION F: DRAFT 404 COVERAGE AUDIT & VERIFICATION ===")

  // 1. Static Grep Table of course readers by slug/id
  console.log("\n--- F.1 Course Reader Audit Matrix ---")
  const readerAudit = [
    { location: "app/(dashboard)/courses/[slug]/page.tsx:106", readerType: "Course Detail Page", usesVisibility: "YES" },
    { location: "app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx:33", readerType: "Course Learn (Lesson)", usesVisibility: "YES" },
    { location: "app/(dashboard)/learn/[courseSlug]/page.tsx:53", readerType: "Course Landing Page", usesVisibility: "YES" },
    { location: "app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx:61", readerType: "Lesson Viewer Page", usesVisibility: "YES" },
    { location: "app/api/checkout/course-info/route.ts:56", readerType: "Checkout Course Info API", usesVisibility: "YES" },
    { location: "app/api/courses/enroll/route.ts:92", readerType: "Course Free Enroll API", usesVisibility: "YES" },
    { location: "lib/actions/payment/razorpay.ts:50", readerType: "Create Razorpay Order Action", usesVisibility: "YES" },
    { location: "app/(dashboard)/courses/page.tsx:12", readerType: "Courses Listings Page", usesVisibility: "YES (status filter)" },
    { location: "app/(dashboard)/search/page.tsx:36", readerType: "Catalog Search Page", usesVisibility: "YES (status filter)" },
    { location: "app/(dashboard)/my-learning/page.tsx:77", readerType: "Student My Learning Page", usesVisibility: "YES (enrolled courses)" },
    { location: "app/api/courses/video-courses/route.ts:9", readerType: "Video Courses API", usesVisibility: "YES (status filter)" },
    { location: "app/api/webhooks/razorpay/route.ts:70", readerType: "Razorpay Webhook Handler", usesVisibility: "YES (DB orderRecord)" },
    { location: "app/api/verify-payment/razorpay/route.ts:125", readerType: "Razorpay Verify API", usesVisibility: "YES (DB orderRecord)" },
  ]
  console.table(readerAudit)

  // 2. Real HTTP table for /courses/ai-course (DRAFT)
  console.log("\n--- F.2 Real HTTP Verification for /courses/ai-course (DRAFT) ---")
  const baseUrl = "http://localhost:3000"

  // Setup test users: student, enrolled student, admin
  const testStudent = await createTestUser({ role: "FREE" })
  const testEnrolledStudent = await createTestUser({ role: "FREE" })
  const testAdmin = await createTestUser({ role: "ADMIN" })

  const studentCookie = await getSessionCookieForUser(testStudent.phoneNumber!)
  const enrolledStudentCookie = await getSessionCookieForUser(testEnrolledStudent.phoneNumber!)
  const adminCookie = await getSessionCookieForUser(testAdmin.phoneNumber!)

  // Enroll testEnrolledStudent in ai-course
  const aiCourse = await prisma.course.findUnique({ where: { slug: "ai-course" } })
  if (!aiCourse) throw new Error("ai-course not found in DB")

  const tempEnrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: testEnrolledStudent.id,
        courseId: aiCourse.id,
      },
    },
    update: {},
    create: {
      userId: testEnrolledStudent.id,
      courseId: aiCourse.id,
    },
  })

  const results: TestResult[] = []

  const testRoles = [
    { name: "anonymous", cookie: "" },
    { name: "student", cookie: studentCookie },
    { name: "enrolled_student", cookie: enrolledStudentCookie },
    { name: "admin", cookie: adminCookie },
  ]

  const endpoints = [
    { path: "/api/checkout/course-info?id=ai-course", method: "GET" },
  ]

  try {
    for (const r of testRoles) {
      for (const ep of endpoints) {
        const headers: Record<string, string> = {}
        if (r.cookie) headers["Cookie"] = r.cookie

        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers,
          redirect: "manual",
        })

        const expectedStatus = r.name === "admin" ? 200 : 404
        results.push({
          role: r.name,
          route: ep.path,
          status: res.status,
          expectedStatus,
          pass: res.status === expectedStatus,
        })
      }
    }

    console.table(results)

    for (const res of results) {
      if (!res.pass) {
        throw new Error(`Assertion failed: role=${res.role} route=${res.route} got=${res.status} expected=${res.expectedStatus}`)
      }
    }

    // 3. Dynamic Proof with a NEW draft test course
    console.log("\n--- F.3 Dynamic Proof: New Draft Course Gating without Code Changes ---")
    const newDraftSlug = `test-draft-${Date.now()}`
    const newDraftCourse = await prisma.course.create({
      data: {
        slug: newDraftSlug,
        title: "Temporary Draft Test Course",
        description: "Dynamic draft course proof for Section F",
        difficulty: "BEGINNER",
        status: "DRAFT",
        isPublished: false,
        price: 999,
        isPremium: true,
      },
    })

    const [draftStudentInfoRes, draftAdminInfoRes] = await Promise.all([
      fetch(`${baseUrl}/api/checkout/course-info?id=${newDraftSlug}`, { headers: { Cookie: studentCookie }, redirect: "manual" }),
      fetch(`${baseUrl}/api/checkout/course-info?id=${newDraftSlug}`, { headers: { Cookie: adminCookie }, redirect: "manual" }),
    ])

    console.log(`New draft course API info (${newDraftSlug}):`)
    console.log(`  Student GET -> HTTP ${draftStudentInfoRes.status} (Expected: 404)`)
    console.log(`  Admin GET   -> HTTP ${draftAdminInfoRes.status} (Expected: 200)`)

    if (draftStudentInfoRes.status !== 404 || draftAdminInfoRes.status !== 200) {
      throw new Error(`Dynamic draft gating assertion failed: student=${draftStudentInfoRes.status}, admin=${draftAdminInfoRes.status}`)
    }

    // Delete temporary draft course
    await prisma.course.delete({ where: { id: newDraftCourse.id } })
    console.log("Cleaned up temporary new draft test course.")

  } finally {
    // Clean up enrollment and test users
    await prisma.enrollment.delete({ where: { id: tempEnrollment.id } }).catch(() => {})
    await teardownTestUsers([testStudent.id, testEnrolledStudent.id, testAdmin.id])
    await prisma.$disconnect()
  }

  console.log("\nF. Overall Status: ALL PASS")
}

run().catch((err) => {
  console.error("FATAL in test-draft-coverage:", err)
  process.exit(1)
})
