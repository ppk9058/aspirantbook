import { PrismaClient } from "@prisma/client"
import { execSync } from "child_process"

const prisma = new PrismaClient()

async function main() {
    console.log("=== SECTION B: LEAK AUDIT REDO (READ-ONLY) ===\n")

    // 1. Cutoff derivation
    const cutoffRaw = execSync("git show -s --format=%cI 49e8905").toString().trim()
    const cutoffDate = new Date(cutoffRaw)
    console.log(`Cutoff derived from git show -s --format=%cI 49e8905: ${cutoffRaw} (${cutoffDate.toISOString()})`)

    // 2. Query Explanation
    console.log("\n--- B.1: Query Definition & Link Explanation ---")
    console.log(`Payment links to Course via JSON field 'metadata':
SQL equivalent:
  SELECT e.id, e."userId", e."courseId", e."createdAt"
  FROM "Enrollment" e
  LEFT JOIN "Payment" p
    ON p."userId" = e."userId"
   AND (p.metadata->>'courseId' = e."courseId" OR p.metadata->>'courseSlug' = c.slug)
   AND p.status = 'COMPLETED'
   AND p.amount > 0;
Prisma implementation:
  Querying COMPLETED payments with metadata->>'courseId' or metadata->>'courseSlug' matching the course,
  same userId, and amount > 0.
`)

    // Fetch all courses
    const courses = await prisma.course.findMany({
        where: {
            OR: [
                { price: { gt: 0 } },
                { isPremium: true }
            ]
        },
        select: { id: true, slug: true, title: true, price: true, isPremium: true },
        orderBy: { slug: "asc" }
    })

    const allPayments = await prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 } },
        select: { id: true, userId: true, amount: true, metadata: true, createdAt: true }
    })

    console.log(`Total Paid Courses: ${courses.length}`)
    console.log(`Total COMPLETED Payments (>0): ${allPayments.length}\n`)

    const perCourseTable: any[] = []
    const mismatchedEnrollments: any[] = []
    const postCutoffEnrollments: any[] = []

    for (const c of courses) {
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId: c.id },
            include: {
                user: {
                    select: {
                        id: true,
                        progress: {
                            where: {
                                lesson: { chapter: { courseId: c.id } }
                            }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: "asc" }
        })

        let verifiedCount = 0
        let unverifiedCount = 0
        let withProgressCount = 0
        let earliestUnverified: Date | null = null
        let latestUnverified: Date | null = null

        for (const e of enrollments) {
            const hasProgress = e.user.progress.length > 0
            if (hasProgress) withProgressCount++

            // Match payment: same userId AND same courseId/courseSlug
            const matchingPayment = allPayments.find((p) => {
                if (p.userId !== e.userId) return false
                const meta = p.metadata as any
                if (!meta) return false
                return meta.courseId === c.id || meta.courseSlug === c.slug
            })

            // Check if user has ANY payment (to detect cross-course payments)
            const anyUserPayment = allPayments.find((p) => p.userId === e.userId)

            if (matchingPayment) {
                verifiedCount++
                if (matchingPayment.amount !== (c.price ?? 0)) {
                    mismatchedEnrollments.push({
                        enrollmentId: e.id,
                        userIdMasked: e.userId.slice(0, 6) + "...",
                        courseSlug: c.slug,
                        coursePrice: c.price,
                        paymentId: matchingPayment.id,
                        paymentAmount: matchingPayment.amount,
                        reason: "Amount mismatch (price != payment amount)"
                    })
                }
            } else {
                unverifiedCount++
                if (!earliestUnverified || e.enrolledAt < earliestUnverified) earliestUnverified = e.enrolledAt
                if (!latestUnverified || e.enrolledAt > latestUnverified) latestUnverified = e.enrolledAt

                if (anyUserPayment) {
                    const anyMeta = anyUserPayment.metadata as any
                    mismatchedEnrollments.push({
                        enrollmentId: e.id,
                        userIdMasked: e.userId.slice(0, 6) + "...",
                        courseSlug: c.slug,
                        coursePrice: c.price,
                        paymentId: anyUserPayment.id,
                        paymentAmount: anyUserPayment.amount,
                        paidForCourse: anyMeta?.courseSlug || anyMeta?.courseId || (anyMeta?.plan ? `PLAN: ${anyMeta.plan}` : "UNKNOWN/SUBSCRIPTION"),
                        reason: "Payment is for a DIFFERENT course/plan"
                    })
                }
            }

            // Post-cutoff check
            if (e.enrolledAt > cutoffDate) {
                postCutoffEnrollments.push({
                    enrollmentId: e.id,
                    userIdMasked: e.userId.slice(0, 6) + "...",
                    courseSlug: c.slug,
                    enrolledAt: e.enrolledAt.toISOString()
                })
            }
        }

        if (enrollments.length > 0) {
            perCourseTable.push({
                courseSlug: c.slug,
                price: c.price,
                total: enrollments.length,
                verified: verifiedCount,
                unverified: unverifiedCount,
                withProgress: withProgressCount,
                earliestUnverified: earliestUnverified ? earliestUnverified.toISOString() : "—",
                latestUnverified: latestUnverified ? latestUnverified.toISOString() : "—"
            })
        }
    }

    console.log("--- B.1: PER-COURSE LEAK AUDIT TABLE ---")
    console.table(perCourseTable)

    console.log("\n--- B.2: MISMATCHED ENROLLMENTS / CROSS-COURSE PAYMENTS ---")
    console.log(`Found ${mismatchedEnrollments.length} mismatched enrollments:`)
    console.table(mismatchedEnrollments)

    console.log("\n--- B.3: POST-CUTOFF ENROLLMENTS (Created after cutoff) ---")
    console.log(`Cutoff: ${cutoffRaw}`)
    console.log(`Found ${postCutoffEnrollments.length} post-cutoff enrollments:`)
    console.table(postCutoffEnrollments)
}

main().finally(() => prisma.$disconnect())
