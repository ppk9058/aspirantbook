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
