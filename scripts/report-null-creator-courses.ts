import { PrismaClient } from "@prisma/client"
import { assertTestDb } from "../lib/testing/assert-test-db"

// Ensure environment points to test DB
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

assertTestDb()

const prisma = new PrismaClient()

async function reportNullCreatorCourses() {
  try {
    const nullCourses = await prisma.course.findMany({
      where: { createdById: null },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    console.log(`=== COURSES WITH NULL CREATOR (createdById === null) ===`)
    console.log(`Total count: ${nullCourses.length}`)
    console.log(`------------------------------------------------------`)
    for (const c of nullCourses) {
      console.log(`ID: ${c.id} | Slug: ${c.slug} | Status: ${c.status} | Title: "${c.title}"`)
    }
  } catch (error) {
    console.error("Failed to query courses:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

reportNullCreatorCourses()
