import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { createActor, loginAs, newNonce, prisma, slugFor } from "./test-series-e2e-helpers"

/**
 * B-002 regression: a database outage on /learn/[courseSlug]/[lessonId] must never
 * grant access or serve fabricated mock lessons.
 *
 * This spec deliberately takes the Docker test database offline, so it is opt-in:
 *   DB_OUTAGE_TEST=1 BASE_URL=http://127.0.0.1:3045 npx playwright test tests/e2e/db-outage-learn-fallback.spec.ts
 */

const DB_CONTAINER = "trillionskill-test-db"
const DB_HOST = "127.0.0.1"
const DB_PORT = "54329"
const runOutage = process.env.DB_OUTAGE_TEST === "1"

test.describe.configure({ mode: "serial" })

test.describe("B-002: /learn must fail closed when the database is offline", () => {
  let nonce = ""
  let courseSlug = ""
  let lessonId = ""
  let email = ""

  test.beforeAll(async () => {
    test.skip(!runOutage, "Set DB_OUTAGE_TEST=1 to run the database outage regression")
    nonce = newNonce()
    const student = await createActor(nonce, "FREE", "learn-outage")
    email = student.email

    courseSlug = `${slugFor(nonce)}-outage-course`
    const course = await prisma.course.create({
      data: {
        title: `${nonce} Outage Course`,
        slug: courseSlug,
        description: "Fixture course for the DB outage regression",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: false,
        chapters: {
          create: [
            {
              title: "Chapter 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Real lesson from the database",
                    order: 1,
                    type: "READING",
                    content: "# Real lesson\n\nThis content comes from the database.",
                  },
                ],
              },
            },
          ],
        },
      },
      include: { chapters: { include: { lessons: true } } },
    })

    lessonId = course.chapters[0].lessons[0].id

    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id },
    })
  })

  test.afterAll(async () => {
    if (!runOutage) return
    startDatabase()
    try {
      const course = await prisma.course.findFirst({
        where: { slug: courseSlug },
        include: { chapters: { include: { lessons: true } } },
      })
      if (course) {
        const courseId = course.id
        await prisma.progress.deleteMany({
          where: { lessonId: { in: course.chapters.flatMap((c) => c.lessons.map((l) => l.id)) } },
        })
        await prisma.enrollment.deleteMany({ where: { courseId } })
        await prisma.lesson.deleteMany({
          where: { id: { in: course.chapters.flatMap((c) => c.lessons.map((l) => l.id)) } },
        })
        await prisma.chapter.deleteMany({ where: { courseId } })
        await prisma.course.delete({ where: { id: course.id } })
      }
      await prisma.user.deleteMany({ where: { email } })
    } catch (error) {
      console.error("[db-outage] cleanup failed", error)
    }
  })

  test("renders an error state instead of mock lessons when the DB is down", async ({ page }) => {
    test.skip(!runOutage, "Set DB_OUTAGE_TEST=1 to run the database outage regression")
    test.setTimeout(180_000)

    await loginAs(page, email)

    // Drop pooled connections before the outage so the client can reconnect afterwards.
    await prisma.$disconnect()
    stopDatabase()
    try {
      await page.goto(`/learn/${courseSlug}/${lessonId}`, { waitUntil: "domcontentloaded" })

      await expect(page.getByRole("heading", { name: "Lesson unavailable" })).toBeVisible({
        timeout: 60_000,
      })
      await expect(page.getByText("Introduction & Setup")).toHaveCount(0)
      await expect(page.getByText("Core Architecture & Coding")).toHaveCount(0)
      await expect(page.getByText("Real lesson from the database")).toHaveCount(0)
    } finally {
      startDatabase()
    }
  })
})

function stopDatabase() {
  execFileSync("docker", ["stop", "-t", "1", DB_CONTAINER], { stdio: "inherit" })
}

function startDatabase() {
  try {
    execFileSync("docker", ["start", DB_CONTAINER], { stdio: "inherit" })
  } catch (error) {
    console.error("[db-outage] failed to start the test database", error)
  }
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      execFileSync("docker", ["exec", DB_CONTAINER, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      })
      return
    } catch {
      execFileSync("sleep", ["1"])
    }
  }
  throw new Error("Test database did not become ready in time")
}
