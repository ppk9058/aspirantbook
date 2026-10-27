import { test, expect } from "@playwright/test"
import {
  prisma,
  createActor,
  loginAs,
  newNonce,
  slugFor,
  cleanupNonce,
} from "./test-series-e2e-helpers"

/**
 * A8: course ownership.
 *
 * Before this change every TEACHER could edit/delete any course, add chapters
 * and lessons to it, and read its demo report. These tests drive the real
 * route handlers with two distinct authenticated teachers.
 */

const nonce = newNonce()

async function makeCourse(title: string, createdById: string | null) {
  return prisma.course.create({
    data: {
      title,
      slug: `${slugFor(title)}-${nonce.toLowerCase()}`,
      description: "Ownership fixture course for the A8 regression suite.",
      difficulty: "BEGINNER",
      technology: "General Studies",
      createdById,
      status: "DRAFT",
      isPublished: false,
    },
  })
}

test.describe("A8 course ownership", () => {
  test.afterAll(async () => {
    await prisma.course.deleteMany({ where: { slug: { contains: nonce.toLowerCase() } } })
    await cleanupNonce(nonce)
    await prisma.$disconnect()
  })

  test("a teacher cannot update or delete another teacher's course", async ({ page, request }) => {
    const teacherA = await createActor(nonce, "TEACHER", "owner")
    const teacherB = await createActor(nonce, "TEACHER", "intruder")
    const course = await makeCourse("Owned By Teacher A", teacherA.id)

    await loginAs(page, teacherB.email)
    const putRes = await page.request.put(`/api/admin/courses/${course.id}`, {
      data: { title: "Hijacked title" },
    })
    expect(putRes.status(), await putRes.text()).toBe(403)

    const deleteRes = await page.request.delete(`/api/admin/courses/${course.id}`)
    expect(deleteRes.status()).toBe(403)

    const chapterRes = await page.request.post(`/api/admin/courses/${course.id}/chapters`, {
      data: { title: "Injected chapter" },
    })
    expect(chapterRes.status()).toBe(403)

    const reportRes = await page.request.get(`/api/admin/courses/${course.id}/demo-report`)
    expect(reportRes.status()).toBe(403)

    const after = await prisma.course.findUnique({ where: { id: course.id } })
    expect(after?.title).toBe("Owned By Teacher A")
    expect(await prisma.chapter.count({ where: { courseId: course.id } })).toBe(0)

    // The owner can still do the same operations.
    await loginAs(page, teacherA.email)
    const ownerPut = await page.request.put(`/api/admin/courses/${course.id}`, {
      data: { title: "Renamed by owner" },
    })
    expect(ownerPut.status(), await ownerPut.text()).toBe(200)
    const ownerChapter = await page.request.post(`/api/admin/courses/${course.id}/chapters`, {
      data: { title: "Owner chapter" },
    })
    expect(ownerChapter.status(), await ownerChapter.text()).toBe(201)

    // An administrator can manage any course.
    const admin = await createActor(nonce, "ADMIN", "admin")
    await loginAs(page, admin.email)
    const adminPut = await page.request.put(`/api/admin/courses/${course.id}`, {
      data: { title: "Renamed by admin" },
    })
    expect(adminPut.status(), await adminPut.text()).toBe(200)
  })

  test("a teacher-created course is a private draft", async ({ page }) => {
    const teacher = await createActor(nonce, "TEACHER", "creator")
    await loginAs(page, teacher.email)

    const res = await page.request.post("/api/admin/courses", {
      data: {
        title: `Teacher Draft ${nonce}`,
        isPremium: true,
        status: "PUBLISHED",
      },
    })
    expect(res.status(), await res.text()).toBe(201)
    const body = await res.json()

    const stored = await prisma.course.findUnique({ where: { id: body.id } })
    expect(stored?.status).toBe("DRAFT")
    expect(stored?.isPublished).toBe(false)
    expect(stored?.isPremium).toBe(false)
    expect(stored?.createdById).toBe(teacher.id)
  })

  test("a course with enrolled learners is archived, never deleted", async ({ page }) => {
    const admin = await createActor(nonce, "ADMIN", "archiver")
    const student = await createActor(nonce, "FREE", "learner")
    const course = await makeCourse("Course With Learners", admin.id)
    await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } })

    await loginAs(page, admin.email)
    const res = await page.request.delete(`/api/admin/courses/${course.id}`)
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()
    expect(body.archived).toBe(true)

    const stored = await prisma.course.findUnique({ where: { id: course.id } })
    expect(stored).not.toBeNull()
    expect(stored?.status).toBe("ARCHIVED")
    expect(stored?.isPublished).toBe(false)
  })

  test("demo report is paginated and masks phone numbers for teachers", async ({ page }) => {
    const teacher = await createActor(nonce, "TEACHER", "reporter")
    const student = await createActor(nonce, "FREE", "reported")
    const course = await makeCourse("Demo Report Course", teacher.id)

    // phoneNumber is unique, so derive a per-run value from the nonce
    const phone = `+9198${nonce.replace(/\D/g, "").slice(-8).padStart(8, "0")}`
    await prisma.user.update({
      where: { id: student.id },
      data: { phoneNumber: phone },
    })
    const slot = await prisma.demoSlot.create({
      data: {
        courseId: course.id,
        startTime: new Date(Date.now() + 3_600_000),
        topic: "Ownership demo",
        facultyName: "Faculty",
        agoraChannelName: `a8-${nonce.toLowerCase()}`,
      },
    })
    await prisma.demoBooking.create({
      data: {
        studentId: student.id,
        mobile: phone,
        slotId: slot.id,
        courseId: course.id,
        utmSource: "google",
      },
    })

    await loginAs(page, teacher.email)
    const res = await page.request.get(
      `/api/admin/courses/${course.id}/demo-report?limit=1&offset=0`
    )
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()

    expect(body.pagination.limit).toBe(1)
    expect(body.bookings.length).toBe(1)
    expect(body.summary.totalBookings).toBe(1)
    // masked: only the last four digits survive
    expect(body.bookings[0].studentPhone).toMatch(new RegExp(`${phone.slice(-4)}$`))
    expect(body.bookings[0].studentPhone).not.toContain(phone.slice(2, 7))

    // The admin sees the full number.
    const admin = await createActor(nonce, "ADMIN", "report-admin")
    await loginAs(page, admin.email)
    const adminRes = await page.request.get(`/api/admin/courses/${course.id}/demo-report`)
    expect(adminRes.status()).toBe(200)
    const adminBody = await adminRes.json()
    expect(adminBody.bookings[0].studentPhone).toBe(phone)
  })
})
