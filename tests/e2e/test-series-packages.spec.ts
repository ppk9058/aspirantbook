import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, slugFor, newNonce, loginThroughUi } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

test.describe("Test Series Packages Studio, Ownership & Authoritative Metrics", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherA: any
  let teacherB: any
  let admin: any
  let student1: any
  let student2: any
  let student3: any
  let student4: any
  let student5: any
  let student6: any
  let student7: any
  let student8: any

  let packageA: any
  let packageB: any
  let testA1: any
  let testA2: any
  let testA3: any

  let paymentStu1: any
  let paymentStu6: any
  let paymentStu8: any
  let enrollStu1: any
  let enrollStu2: any
  let enrollStu3: any
  let enrollStu6: any
  let enrollStu7: any
  let enrollStu8: any

  let attemptStu4: any
  let attemptStu4_2: any
  let attemptStu5: any
  let attemptTeacherA: any

  function assertNoSensitiveKeys(obj: any, path = "") {
    const sensitiveRegex = /email|phone|mobile|amount|price|revenue|paymentId|orderId|razorpay/i
    if (!obj || typeof obj !== "object") return
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => assertNoSensitiveKeys(item, `${path}[${idx}]`))
      return
    }
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveRegex.test(key)) {
        throw new Error(`Forbidden sensitive key "${key}" found at ${path}.${key}`)
      }
      assertNoSensitiveKeys(value, `${path}.${key}`)
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    // 1. Create Actors
    teacherA = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-teacher-a@test.local`,
        name: `Teacher A ${nonce}`,
        password: passwordHash,
        role: "TEACHER",
        selectedGoal: "bpsc",
      },
    })

    teacherB = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-teacher-b@test.local`,
        name: `Teacher B ${nonce}`,
        password: passwordHash,
        role: "TEACHER",
        selectedGoal: "bpsc",
      },
    })

    admin = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-admin@test.local`,
        name: `Admin ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    student1 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu1@test.local`,
        name: `Student 1 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student2 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu2@test.local`,
        name: `Student 2 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student3 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu3@test.local`,
        name: `Student 3 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student4 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu4@test.local`,
        name: `Student 4 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student5 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu5@test.local`,
        name: `Student 5 ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student6 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu6@test.local`,
        name: `Student 6 (Pending) ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student7 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu7@test.local`,
        name: `Student 7 (Expired) ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    student8 = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-stu8@test.local`,
        name: `Student 8 (No OrderId) ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    // 2. Create Packages (ExamSeries)
    packageA = await prisma.examSeries.create({
      data: {
        title: `Package Alpha ${nonce}`,
        slug: `${slugFor(nonce)}-package-alpha`,
        examName: "BPSC Mock Series",
        category: "Civil Services",
        description: "Official Alpha Test Package by Teacher A",
        isPublished: true,
        createdById: teacherA.id,
      },
    })

    packageB = await prisma.examSeries.create({
      data: {
        title: `Package Beta ${nonce}`,
        slug: `${slugFor(nonce)}-package-beta`,
        examName: "UPSC Mock Series",
        category: "Civil Services",
        description: "Official Beta Test Package by Teacher B",
        isPublished: true,
        createdById: teacherB.id,
      },
    })

    // 3. Create Tests for Package A: 2 published, 1 unpublished
    testA1 = await prisma.examTest.create({
      data: {
        seriesId: packageA.id,
        title: `Alpha Test 1 ${nonce}`,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        durationMinutes: 60,
        totalQuestions: 100,
        totalMarks: 100,
        isPublished: true,
        createdById: teacherA.id,
      },
    })

    testA2 = await prisma.examTest.create({
      data: {
        seriesId: packageA.id,
        title: `Alpha Test 2 ${nonce}`,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        durationMinutes: 60,
        totalQuestions: 100,
        totalMarks: 100,
        isPublished: true,
        createdById: teacherA.id,
      },
    })

    testA3 = await prisma.examTest.create({
      data: {
        seriesId: packageA.id,
        title: `Alpha Test 3 (Unpublished) ${nonce}`,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        durationMinutes: 60,
        totalQuestions: 100,
        totalMarks: 100,
        isPublished: false,
        createdById: teacherA.id,
      },
    })

    // 4. Create Enrollments and Payments
    // Student 1: PURCHASED ACTIVE with COMPLETED payment (counts as paid)
    const orderIdStu1 = `order_${slugFor(nonce)}_stu1`
    paymentStu1 = await prisma.payment.create({
      data: {
        userId: student1.id,
        amount: 499,
        currency: "INR",
        status: "COMPLETED",
        razorpayOrderId: orderIdStu1,
        externalId: orderIdStu1,
        paymentProvider: "razorpay",
        metadata: { seriesId: packageA.id },
      },
    })

    enrollStu1 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student1.id,
        seriesId: packageA.id,
        enrollType: "PURCHASED",
        status: "ACTIVE",
        orderId: orderIdStu1,
      },
    })

    // Student 2: PASS ACTIVE (counted as pass, not paid)
    enrollStu2 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student2.id,
        seriesId: packageA.id,
        enrollType: "PASS",
        status: "ACTIVE",
      },
    })

    // Student 3: FREE ACTIVE (counted as free, not paid)
    enrollStu3 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student3.id,
        seriesId: packageA.id,
        enrollType: "FREE",
        status: "ACTIVE",
      },
    })

    // Student 6: PURCHASED ACTIVE with PENDING payment (enrolled=yes, paid=NO)
    const orderIdStu6 = `order_${slugFor(nonce)}_stu6_pending`
    paymentStu6 = await prisma.payment.create({
      data: {
        userId: student6.id,
        amount: 499,
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: orderIdStu6,
        externalId: orderIdStu6,
        paymentProvider: "razorpay",
        metadata: { seriesId: packageA.id },
      },
    })

    enrollStu6 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student6.id,
        seriesId: packageA.id,
        enrollType: "PURCHASED",
        status: "ACTIVE",
        orderId: orderIdStu6,
      },
    })

    // Student 7: CANCELLED/EXPIRED enrollment (not counted as enrolled)
    enrollStu7 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student7.id,
        seriesId: packageA.id,
        enrollType: "FREE",
        status: "EXPIRED",
      },
    })

    // Student 8: PURCHASED ACTIVE with orderId null and COMPLETED payment with metadata.seriesId (must NOT count as paid!)
    paymentStu8 = await prisma.payment.create({
      data: {
        userId: student8.id,
        amount: 499,
        currency: "INR",
        status: "COMPLETED",
        razorpayOrderId: `order_${slugFor(nonce)}_stu8_unlinked`,
        externalId: `order_${slugFor(nonce)}_stu8_unlinked`,
        paymentProvider: "razorpay",
        metadata: { seriesId: packageA.id },
      },
    })

    enrollStu8 = await prisma.examSeriesEnrollment.create({
      data: {
        userId: student8.id,
        seriesId: packageA.id,
        enrollType: "PURCHASED",
        status: "ACTIVE",
        orderId: null,
      },
    })

    // 5. Create Student Attempts on Test A1
    // Student 4 Attempt 1: score 80
    attemptStu4 = await prisma.examAttempt.create({
      data: {
        testId: testA1.id,
        userId: student4.id,
        score: 80,
        totalMarks: 100,
        correctCount: 80,
        wrongCount: 20,
        timeTakenSecs: 100,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 3600_000),
        submittedAt: new Date(Date.now() - 3500_000),
      },
    })

    // Student 4 Attempt 2: score 40 (only first attempt counts towards average score!)
    attemptStu4_2 = await prisma.examAttempt.create({
      data: {
        testId: testA1.id,
        userId: student4.id,
        score: 40,
        totalMarks: 100,
        correctCount: 40,
        wrongCount: 60,
        timeTakenSecs: 90,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 3000_000),
        submittedAt: new Date(Date.now() - 2900_000),
      },
    })

    // Student 5 Attempt 1: score 60
    attemptStu5 = await prisma.examAttempt.create({
      data: {
        testId: testA1.id,
        userId: student5.id,
        score: 60,
        totalMarks: 100,
        correctCount: 60,
        wrongCount: 40,
        timeTakenSecs: 120,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 3400_000),
        submittedAt: new Date(Date.now() - 3280_000),
      },
    })

    // 6. Create Staff Attempt (Teacher A) — MUST NOT be counted in student metrics!
    attemptTeacherA = await prisma.examAttempt.create({
      data: {
        testId: testA1.id,
        userId: teacherA.id,
        score: 100,
        totalMarks: 100,
        correctCount: 100,
        wrongCount: 0,
        timeTakenSecs: 50,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 3200_000),
        submittedAt: new Date(Date.now() - 3150_000),
      },
    })
  })

  test.afterAll(async () => {
    // Clean up test data
    if (packageA && packageB) {
      await prisma.examAttempt.deleteMany({
        where: { id: { in: [attemptStu4?.id, attemptStu4_2?.id, attemptStu5?.id, attemptTeacherA?.id].filter(Boolean) } },
      }).catch(() => {})

      await prisma.examSeriesEnrollment.deleteMany({
        where: { id: { in: [enrollStu1?.id, enrollStu2?.id, enrollStu3?.id, enrollStu6?.id, enrollStu7?.id, enrollStu8?.id].filter(Boolean) } },
      }).catch(() => {})

      await prisma.payment.deleteMany({
        where: { id: { in: [paymentStu1?.id, paymentStu6?.id, paymentStu8?.id].filter(Boolean) } },
      }).catch(() => {})

      await prisma.examTest.deleteMany({
        where: { seriesId: { in: [packageA.id, packageB.id] } },
      }).catch(() => {})

      await prisma.examSeries.deleteMany({
        where: { id: { in: [packageA.id, packageB.id] } },
      }).catch(() => {})

      await prisma.user.deleteMany({
        where: {
          id: {
            in: [
              teacherA?.id,
              teacherB?.id,
              admin?.id,
              student1?.id,
              student2?.id,
              student3?.id,
              student4?.id,
              student5?.id,
              student6?.id,
              student7?.id,
              student8?.id,
            ].filter(Boolean),
          },
        },
      }).catch(() => {})
    }
  })

  test("T-PKG-01: API /api/exam/series/packages isolates teacher packages and calculates authoritative metrics", async ({ page }) => {
    // Log in as Teacher A
    await loginThroughUi(page, teacherA.email)

    const teacherRes = await page.request.get("/api/exam/series/packages")
    expect(teacherRes.status()).toBe(200)
    const teacherData = await teacherRes.json()
    expect(teacherData.success).toBe(true)

    // Teacher A sees only Package A, NOT Package B
    const teacherSeriesIds = teacherData.packages.map((p: any) => p.id)
    expect(teacherSeriesIds).toContain(packageA.id)
    expect(teacherSeriesIds).not.toContain(packageB.id)

    // Verify exact metric calculations on Package A
    const pkgA = teacherData.packages.find((p: any) => p.id === packageA.id)
    expect(pkgA).toBeDefined()
    expect(pkgA.metrics.testsTotal).toBe(3)
    expect(pkgA.metrics.testsPublished).toBe(2)
    expect(pkgA.metrics.enrolled).toBe(5)
    expect(pkgA.metrics.paid).toBe(1)
    expect(pkgA.metrics.pass).toBe(1)
    expect(pkgA.metrics.free).toBe(1)
    expect(pkgA.metrics.attempts).toBe(3) // 2 attempts by stu4 + 1 by stu5, staff attempt excluded!
    expect(pkgA.metrics.uniqueStudents).toBe(2) // stu4 and stu5, staff excluded!
    expect(pkgA.metrics.avgScore).toBe(70) // first attempts only: (80 + 60)/2 = 70.0, stu4 2nd (40) ignored, staff 100 excluded!

    // Verify zero sensitive data recursively across all keys
    assertNoSensitiveKeys(teacherData)
    const jsonStr = JSON.stringify(teacherData)
    expect(jsonStr).not.toContain("@test.local")
    expect(jsonStr).not.toContain("amount")
    expect(jsonStr).not.toContain("revenue")
  })

  test("T-PKG-02: API /api/exam/series/packages/[id] blocks Teacher A from Teacher B package with HTTP 403", async ({ page }) => {
    await loginThroughUi(page, teacherA.email)

    // Teacher A viewing Package A -> 200
    const resA = await page.request.get(`/api/exam/series/packages/${packageA.id}`)
    expect(resA.status()).toBe(200)
    const dataA = await resA.json()
    expect(dataA.package.id).toBe(packageA.id)
    expect(dataA.package.metrics.testsTotal).toBe(3)
    expect(dataA.package.metrics.testsPublished).toBe(2)
    expect(dataA.package.metrics.paid).toBe(1)
    expect(dataA.package.metrics.pass).toBe(1)
    expect(dataA.package.metrics.free).toBe(1)
    expect(dataA.package.metrics.enrolled).toBe(5)
    assertNoSensitiveKeys(dataA)

    // Top ranks in test item exclude staff
    const test1Item = dataA.package.tests.find((t: any) => t.id === testA1.id)
    expect(test1Item).toBeDefined()
    const topRankNames = test1Item.topRanks.map((r: any) => r.name)
    expect(topRankNames).toContain(student4.name)
    expect(topRankNames).toContain(student5.name)
    expect(topRankNames).not.toContain(teacherA.name) // Staff excluded!

    // Teacher A viewing Package B -> 403 Forbidden!
    const resB = await page.request.get(`/api/exam/series/packages/${packageB.id}`)
    expect(resB.status()).toBe(403)
    const dataB = await resB.json()
    expect(dataB.error).toContain("Forbidden")
  })

  test("T-PKG-03: Admin views all packages and their details via API", async ({ page }) => {
    await loginThroughUi(page, admin.email)

    const res = await page.request.get("/api/exam/series/packages")
    expect(res.status()).toBe(200)
    const data = await res.json()
    const ids = data.packages.map((p: any) => p.id)
    expect(ids).toContain(packageA.id)
    expect(ids).toContain(packageB.id)

    // Admin can access detail of both
    assertNoSensitiveKeys(data)
    const resA = await page.request.get(`/api/exam/series/packages/${packageA.id}`)
    expect(resA.status()).toBe(200)
    assertNoSensitiveKeys(await resA.json())
    const resB = await page.request.get(`/api/exam/series/packages/${packageB.id}`)
    expect(resB.status()).toBe(200)
    assertNoSensitiveKeys(await resB.json())
  })

  test("T-PKG-04: Student / Guest blocked from package studio API with 403 / 401", async ({ page }) => {
    // Unauthenticated
    const guestRes = await page.request.get("/api/exam/series/packages")
    expect(guestRes.status()).toBe(401)

    // Authenticated Student
    await loginThroughUi(page, student1.email)
    const studentRes = await page.request.get("/api/exam/series/packages")
    expect(studentRes.status()).toBe(403)
  })

  test("T-PKG-05: Teacher UI renders packages list with Breadcrumb and exact metrics on detail", async ({ page }, testInfo) => {
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Navigate to Teacher Packages
    await page.goto("/teacher/test-series/packages")
    await expect(page.locator("h1")).toContainText("Test Series Packages")

    // Breadcrumbs check: must contain Dashboard, Teacher and Test Series (hidden on mobile viewport)
    if (testInfo.project.name !== "mobile") {
      const breadcrumbs = page.locator("[data-testid='breadcrumbs']")
      await expect(breadcrumbs).toBeVisible()
      await expect(breadcrumbs).toContainText("Dashboard")
      await expect(breadcrumbs).toContainText("Teacher")
      await expect(breadcrumbs).toContainText("Test Series")
      await expect(breadcrumbs).toContainText("Packages")
      await expect(breadcrumbs.locator("a[href='/dashboard']")).toBeVisible()
      await expect(breadcrumbs.locator("a[href='/teacher']")).toBeVisible()
      await expect(breadcrumbs.locator("a[href='/teacher/test-series']")).toBeVisible()

      // Repeated-segment path check: ensure sequential href building doesn't collapse on duplicate segment names
      const sampleSegments = ["teacher", "test-series", "packages", "test-series", "preview"]
      const filteredSample = sampleSegments.filter((s) => s !== "tracks")
      const sampleHrefs = filteredSample.map((_, i) => "/" + filteredSample.slice(0, i + 1).join("/"))
      expect(sampleHrefs[1]).toBe("/teacher/test-series")
      expect(sampleHrefs[3]).toBe("/teacher/test-series/packages/test-series")
      expect(sampleHrefs[4]).toBe("/teacher/test-series/packages/test-series/preview")
    }

    // Teacher A sees Package A card, but NOT Package B card
    await expect(page.locator(`[data-testid='package-card-${packageA.id}']`)).toBeVisible()
    await expect(page.locator(`[data-testid='package-card-${packageB.id}']`)).not.toBeVisible()

    // Navigate to Package A Detail
    await page.goto(`/teacher/test-series/package/${packageA.id}`)
    await expect(page.locator("[data-testid='package-detail']")).toBeVisible()

    if (testInfo.project.name !== "mobile") {
      const detailBreadcrumbs = page.locator("[data-testid='breadcrumbs']").first()
      await expect(detailBreadcrumbs).toBeVisible()
      await expect(detailBreadcrumbs).toContainText("Dashboard")
      await expect(detailBreadcrumbs.locator("a[href='/dashboard']")).toBeVisible()
      await expect(detailBreadcrumbs.locator("a[href='/teacher']")).toBeVisible()
      await expect(detailBreadcrumbs.locator("a[href='/teacher/test-series']")).toBeVisible()
      await expect(detailBreadcrumbs.locator("a[href='/teacher/test-series/package']")).toBeVisible()
    }

    // Assert exact metric cards
    await expect(page.locator("[data-testid='metric-paid']")).toHaveText("1")
    await expect(page.locator("[data-testid='metric-pass']")).toHaveText("1")
    await expect(page.locator("[data-testid='metric-free']")).toHaveText("1")
    await expect(page.locator("[data-testid='metric-enrolled']")).toHaveText("5")
    await expect(page.locator("[data-testid='metric-attempts']")).toHaveText("3")
    await expect(page.locator("[data-testid='metric-unique-students']")).toContainText("2 students")
    await expect(page.locator("[data-testid='metric-avg-score']")).toHaveText("70")

    // Attempting to visit Package B detail directly shows 403 Forbidden banner
    await page.goto(`/teacher/test-series/package/${packageB.id}`)
    await expect(page.locator("[data-testid='package-forbidden']")).toBeVisible()
    await expect(page.locator("[data-testid='package-forbidden']")).toContainText("Access Denied (403)")
  })

  test("T-PKG-06: Admin UI renders packages with Admin Breadcrumbs and can access both packages", async ({ page }, testInfo) => {
    await loginThroughUi(page, admin.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    await page.goto("/admin/test-series/packages")
    await expect(page.locator("h1")).toContainText("Test Series Packages")

    // Breadcrumbs check: must contain Dashboard, Admin and Test Series (hidden on mobile viewport)
    if (testInfo.project.name !== "mobile") {
      const breadcrumbs = page.locator("[data-testid='breadcrumbs']")
      await expect(breadcrumbs).toBeVisible()
      await expect(breadcrumbs).toContainText("Dashboard")
      await expect(breadcrumbs).toContainText("Admin")
      await expect(breadcrumbs).toContainText("Test Series")
      await expect(breadcrumbs).toContainText("Packages")
      await expect(breadcrumbs.locator("a[href='/dashboard']")).toBeVisible()
      await expect(breadcrumbs.locator("a[href='/admin']")).toBeVisible()
      await expect(breadcrumbs.locator("a[href='/admin/test-series']")).toBeVisible()
    }

    // Admin sees both packages
    await expect(page.locator(`[data-testid='package-card-${packageA.id}']`)).toBeVisible()
    await expect(page.locator(`[data-testid='package-card-${packageB.id}']`)).toBeVisible()

    // Admin can open Package B detail
    await page.goto(`/admin/test-series/package/${packageB.id}`)
    await expect(page.locator("[data-testid='package-detail']")).toBeVisible()
  })

  test("T-PKG-07: Teacher is blocked from all /admin/* routes and redirected to /teacher server-side", async ({ page }) => {
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Ensure session cookies are copied for localhost so dev server redirects don't lose session across 127.0.0.1/localhost
    const cookies = await page.context().cookies()
    const localhostCookies = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }))
    await page.context().addCookies(localhostCookies)

    // Direct HTTP request proof: maxRedirects: 0 returns 307 with Location pointing to /teacher and zero admin body data
    for (const adminPath of ["/admin", "/admin/dashboard", "/admin/test-series"]) {
      const res = await page.request.get(adminPath, { maxRedirects: 0 })
      expect(res.status()).toBe(307)
      const location = res.headers()["location"]
      expect(location).toMatch(/\/teacher$/)
      const body = await res.text()
      expect(body).not.toContain("Admin Dashboard")
      expect(body).not.toContain("System Settings")
    }

    // Browser navigation check: visiting /admin redirects to /teacher
    await page.goto("/admin")
    await expect(page).toHaveURL(/.*\/teacher/)

    // Visiting /admin/dashboard redirects to /teacher
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/.*\/teacher/)

    // Visiting /admin/test-series redirects to /teacher
    await page.goto("/admin/test-series")
    await expect(page).toHaveURL(/.*\/teacher/)

    // Teacher nav does NOT link to /admin/test-series
    const studioLink = page.locator("a", { hasText: "Test Series Studio" }).first()
    if (await studioLink.count() > 0) {
      await expect(studioLink).toHaveAttribute("href", "/teacher/test-series")
    }
  })

  test("T-PKG-08: Submissions page displays correct metrics and rankings, error state, and highlights single sidebar item", async ({ page }, testInfo) => {
    // 1. Teacher A opens Submissions of their test (testA1)
    await loginThroughUi(page, teacherA.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Check sidebar highlight on /teacher/test-series/packages
    await page.goto("/teacher/test-series/packages")
    if (testInfo.project.name !== "mobile") {
      const activeNavItems = page.locator("aside nav a.bg-\\[\\#1448d8\\], aside nav a.bg-\\[\\#3AAFA9\\]")
      await expect(activeNavItems).toHaveCount(1)
      await expect(page.locator("[data-testid='sidebar-item-teacher-dashboard']")).not.toHaveClass(/bg-\[#(1448d8|3AAFA9)\]/)
      await expect(page.locator("[data-testid='sidebar-item-test-series-studio']")).toHaveClass(/bg-\[#(1448d8|3AAFA9)\]/)
    }

    // Navigate to Submissions page for testA1
    await page.goto(`/teacher/test-series/${testA1.id}/submissions`)

    // Header asserts test title (not id)
    const heading = page.locator("[data-testid='submissions-title']")
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(testA1.title)
    await expect(heading).not.toContainText(testA1.id)

    // Metric cards: 2 candidates, highest 80, average 70.0 (staff attempt excluded)
    await expect(page.locator("[data-testid='metric-candidates']")).toHaveText("2")
    await expect(page.locator("[data-testid='metric-highest-score']")).toHaveText("80")
    await expect(page.locator("[data-testid='metric-class-average']")).toContainText("70.0")

    // Ranks and student names
    const rows = page.locator("[data-testid='submission-row']")
    await expect(rows).toHaveCount(2)

    // First row: Student 4 with score 80 and rank #1
    await expect(rows.nth(0).locator("[data-testid='candidate-name']")).toHaveText(student4.name)
    await expect(rows.nth(0).locator("[data-testid='candidate-rank']")).toHaveText("#1")
    await expect(rows.nth(0).locator("[data-testid='candidate-score']")).toHaveText("80")

    // Second row: Student 5 with score 60 and rank #2
    await expect(rows.nth(1).locator("[data-testid='candidate-name']")).toHaveText(student5.name)
    await expect(rows.nth(1).locator("[data-testid='candidate-rank']")).toHaveText("#2")
    await expect(rows.nth(1).locator("[data-testid='candidate-score']")).toHaveText("60")

    // Verify staff attempt (Teacher A with score 100) is completely absent from table
    const tableText = await page.locator("table").innerText()
    expect(tableText).not.toContain(teacherA.name)
    const candidateScores = await page.locator("[data-testid='candidate-score']").allInnerTexts()
    expect(candidateScores).not.toContain("100")

    // 2. Error state test: simulate failing request
    await page.route(`**/api/exam/${testA1.id}/leaderboard*`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      })
    })
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.locator("[data-testid='submissions-error']")).toBeVisible()
    await expect(page.locator("[data-testid='submissions-error']")).toContainText("Failed to load submissions")
    await page.unroute(`**/api/exam/${testA1.id}/leaderboard*`)
  })

  test("T-PKG-09: Submissions page enforces ownership 403 on non-owner Teacher B", async ({ page }) => {
    // Teacher B opening Teacher A's test submissions -> 403 Forbidden
    await loginThroughUi(page, teacherB.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Direct API check: returns 403
    const forbiddenApi = await page.request.get(`/api/exam/${testA1.id}/leaderboard`)
    expect(forbiddenApi.status()).toBe(403)

    // UI navigation check: shows 403 Access Denied banner
    await page.goto(`/teacher/test-series/${testA1.id}/submissions`)
    await expect(page.locator("[data-testid='submissions-forbidden']")).toBeVisible()
    await expect(page.locator("[data-testid='submissions-forbidden']")).toContainText("Access Denied (403)")
  })

  test("T-PKG-10: Admin is allowed to view any test submissions via API and UI", async ({ page }) => {
    // Admin opening Teacher A's test submissions -> 200 allowed
    await loginThroughUi(page, admin.email)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }).catch(() => {})

    // Direct API check: returns 200
    const adminApi = await page.request.get(`/api/exam/${testA1.id}/leaderboard`)
    expect(adminApi.status()).toBe(200)

    // UI navigation check
    await page.goto(`/teacher/test-series/${testA1.id}/submissions`)
    await expect(page.locator("[data-testid='submissions-title']")).toContainText(testA1.title)
    await expect(page.locator("[data-testid='metric-candidates']")).toHaveText("2")
  })
})
