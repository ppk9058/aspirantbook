import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config({ path: ".env.test", override: true })

export default async function globalSetup() {
  const testDbUrl = process.env.TEST_DATABASE_URL || "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"

  // 1. Validate Docker test DB connection
  const prisma = new PrismaClient({ datasourceUrl: testDbUrl })
  try {
    const rawRes = await prisma.$queryRawUnsafe<{ current_database: string }[]>("SELECT current_database()")
    const dbName = rawRes?.[0]?.current_database || ""
    if (!dbName.endsWith("_test")) {
      throw new Error(`Connected database "${dbName}" is not a test database! Must end with _test.`)
    }
  } catch (err: any) {
    throw new Error(
      `\n[FAST PREFLIGHT FAILURE] Docker test database is unreachable at 127.0.0.1:54329!\n` +
      `Ensure Docker container is started by running:\n  npm run test:db:up\n` +
      `Original error: ${err.message}\n`
    )
  }

  // 2. Validate DB migration and schema sync
  try {
    await prisma.user.count()
  } catch (err: any) {
    throw new Error(
      `\n[FAST PREFLIGHT FAILURE] Docker test database is not migrated!\n` +
      `Run test database migration using:\n  npm run test:db:reset\n` +
      `Original error: ${err.message}\n`
    )
  } finally {
    await prisma.$disconnect()
  }

  // 2b. Run schema drift check
  const { checkDatabaseSchema } = await import("../../scripts/db-check")
  const schemaCheck = checkDatabaseSchema(testDbUrl)
  if (!schemaCheck.ok) {
    throw new Error(`\n[FAST PREFLIGHT FAILURE] Database schema drift detected:\n${schemaCheck.message}\n`)
  }

  // 2c. Ensure canonical tutorial fixture exists for tutorial layout & drawer specs
  const setupPrisma = new PrismaClient({ datasourceUrl: testDbUrl })
  try {
    const existing = await setupPrisma.course.findFirst({ where: { slug: "agentic-engineering-zero-to-hero" } })
    if (!existing) {
      await setupPrisma.course.create({
        data: {
          title: "Agentic Engineering: Zero to Hero",
          slug: "agentic-engineering-zero-to-hero",
          description: "The complete 35-chapter masterclass on production agentic AI, tool calling, multi-agent swarms, verification, and automated evaluation.",
          technology: "Skill & Tech",
          difficulty: "ADVANCED",
          status: "PUBLISHED",
          isPublished: true,
          metadataJson: JSON.stringify({ format: "tutorial", meta: { format: "tutorial" } }),
          chapters: {
            create: [
              {
                title: "CHAPTER 1 — What Is an AI",
                order: 1,
                lessons: {
                  create: [
                    {
                      title: "CHAPTER 1 — What Is an AI",
                      order: 1,
                      type: "READING",
                      content: "Deterministic code meets autonomous loops in modern software development.",
                    },
                    ...Array.from({ length: 34 }, (_, idx) => ({
                      title: `Chapter ${idx + 2} — Agentic Engineering Architecture ${idx + 2}`,
                      order: idx + 2,
                      type: "READING" as const,
                      content: `Detailed reading guide and production notes for topic ${idx + 2}.`,
                    })),
                  ],
                },
              },
            ],
          },
        },
      })
    } else {
      // Ensure no duplicate lessons
      const dupLessons = await setupPrisma.lesson.findMany({
        where: {
          chapter: { courseId: existing.id },
          title: "CHAPTER 1 — What Is an AI",
        },
        orderBy: { createdAt: "asc" },
      })
      if (dupLessons.length > 1) {
        for (let i = 1; i < dupLessons.length; i++) {
          await setupPrisma.lesson.delete({ where: { id: dupLessons[i].id } }).catch(() => {})
        }
      }
    }

    // 2d. Ensure CA system series and UPSC Economy CA test exist
    const existingSeries = await setupPrisma.examSeries.findFirst({
      where: { slug: "current-affairs-system-series" },
    })
    const instructor = await setupPrisma.user.findFirst({
      where: { role: "TEACHER" },
    })
    const createdById = instructor?.id || "u_instructor_seed"

    const caSeries = existingSeries || (await setupPrisma.examSeries.create({
      data: {
        id: "cmv5cyek3000oxpzvug9zvj4q",
        title: "Current Affairs Quizzes",
        slug: "current-affairs-system-series",
        examName: "Current Affairs",
        category: "Current Affairs",
        description: "System series for Current Affairs Quizzes",
        isFree: true,
        isPro: false,
        isPublished: false,
        createdById,
      },
    }))

    const existingTest = await setupPrisma.examTest.findFirst({
      where: { title: "UPSC Economy CA" },
    })
    if (!existingTest) {
      const caQuiz = await setupPrisma.examTest.create({
        data: {
          id: "cmv5d7r52003oxpzv4x54dnie",
          title: "UPSC Economy CA",
          seriesId: caSeries.id,
          testType: "CURRENT_AFFAIRS",
          accessMode: "FREE",
          durationMinutes: 10,
          totalQuestions: 10,
          totalMarks: 10,
          positiveMarks: 1,
          negativeMarks: 0.33,
          month: 10,
          year: 2026,
          isPublished: true,
          createdById,
        },
      })

      const caSection = await setupPrisma.examSection.create({
        data: {
          id: "cmv5d7r6u003qxpzvly7ymvo1",
          title: "General Studies",
          testId: caQuiz.id,
          order: 1,
          positiveMarks: 1,
          negativeMarks: 0.33,
        },
      })

      await setupPrisma.examQuestion.create({
        data: {
          id: "cmv5d7r8m003rxpzvncey2hdq",
          sectionId: caSection.id,
          questionType: "MCQ",
          questionEn: "With reference to the Monetary Policy Committee (MPC) decisions of the Reserve Bank of India in October 2026, consider the following statements: 1. The MPC raised the policy repo rate by 25 basis points to 5.50%. 2. The monetary policy stance was changed from 'neutral' to 'calibrated tightening'. Which of the statements given above is/are correct?",
          optionAEn: "1 only",
          optionBEn: "2 only",
          optionCEn: "Both 1 and 2",
          optionDEn: "Neither 1 nor 2",
          correctOption: "C",
          explanationEn: "In its October 2026 meeting, the RBI's MPC unanimously voted to increase the policy repo rate by 25 bps to 5.50% to counter persistent inflationary pressures.",
          order: 1,
          positiveMarks: 1,
          negativeMarks: 0.33,
        },
      })
    }
  } finally {
    await setupPrisma.$disconnect()
  }

  // 3. If server is already running on 3045, verify it is connected to trillionskill_test
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const healthRes = await fetch("http://127.0.0.1:3045/api/test/health", { signal: controller.signal })
    clearTimeout(timeout)
    if (healthRes.ok) {
      const data = await healthRes.json()
      if (data.database !== "trillionskill_test") {
        throw new Error(
          `\n[FAST PREFLIGHT FAILURE] The server currently running on port 3045 is connected to "${data.database}", NOT "trillionskill_test"!\n` +
          `Stop the running process or restart it with DATABASE_URL set to Docker test DB.\n`
        )
      }
    }
  } catch (err: any) {
    if (err.message?.includes("[FAST PREFLIGHT FAILURE]")) {
      throw err
    }
    // Server is not yet running; Playwright webServer will launch it automatically.
  }
}
