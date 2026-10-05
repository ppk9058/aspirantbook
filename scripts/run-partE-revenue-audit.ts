import { prisma } from "../lib/prisma"

async function runRevenueAudit() {
  console.log("=== [Part E] Revenue-Leak Audit (Read-Only) ===\n")

  // Exact query definition:
  // 1. Fetch all courses with price > 0
  const paidCourses = await prisma.course.findMany({
    where: { price: { gt: 0 } },
    select: { id: true, title: true, slug: true, price: true, isPremium: true },
    orderBy: { price: "desc" }
  })

  console.log(`Total paid courses with price > 0: ${paidCourses.length}\n`)

  const tableData = []

  for (const course of paidCourses) {
    // 2. Fetch enrollments excluding e2e tests
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: course.id,
        user: {
          AND: [
            { email: { not: { contains: "e2e_" } } },
            { email: { not: { contains: "test_" } } },
            { name: { not: { contains: "Test" } } }
          ]
        }
      },
      select: {
        id: true,
        userId: true,
        enrolledAt: true,
      }
    })

    const leaks = []
    let activeLeaksCount = 0

    for (const e of enrollments) {
      // Check for matching successful payment
      const payment = await prisma.payment.findFirst({
        where: {
          userId: e.userId,
          status: "COMPLETED"
        }
      })

      if (!payment) {
        leaks.push(e)

        // Check if this leaked user has any progress rows in that course
        const progressCount = await prisma.progress.count({
          where: {
            userId: e.userId,
            lesson: {
              chapter: { courseId: course.id }
            }
          }
        })
        if (progressCount > 0) {
          activeLeaksCount++
        }
      }
    }

    const leakDates = leaks.map(l => l.enrolledAt.toISOString()).sort()

    tableData.push({
      course: course.title.slice(0, 30),
      slug: course.slug.slice(0, 30),
      price: course.price,
      totalEnrollments: enrollments.length,
      leakCount: leaks.length,
      activeWithProgress: activeLeaksCount,
      earliestLeakDate: leakDates.length > 0 ? leakDates[0].slice(0, 10) : "N/A",
      latestLeakDate: leakDates.length > 0 ? leakDates[leakDates.length - 1].slice(0, 10) : "N/A"
    })
  }

  console.table(tableData)
}

runRevenueAudit().catch(console.error).finally(() => prisma.$disconnect())
