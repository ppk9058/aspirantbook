import { prisma } from "../lib/prisma"

function maskId(id: string) {
    return id.length > 8 ? id.slice(0, 8) + "..." : id
}

// Definition of test user pattern (see Section C):
// Any user whose email contains '@example.test', '@aspirantbook.local', 'test_',
// or whose id starts with 'u-', 'test-', 'att-', 'usr_test'
export function isTestUser(user: { id: string; email?: string | null }) {
    if (!user) return false
    const id = user.id.toLowerCase()
    const email = (user.email || "").toLowerCase()
    return (
        id.startsWith("u-") ||
        id.startsWith("test-") ||
        id.startsWith("usr_test") ||
        id.startsWith("att-") ||
        email.endsWith("@example.test") ||
        email.endsWith("@aspirantbook.local") ||
        email.includes("test_")
    )
}

async function main() {
    console.log("=== B.1: ALL COURSES ENROLLMENT REPORT ===")
    const allCourses = await prisma.course.findMany({
        select: {
            id: true,
            slug: true,
            price: true,
            status: true,
            enrollments: {
                select: {
                    enrolledAt: true,
                    userId: true,
                    user: { select: { id: true, email: true } },
                },
            },
        },
        orderBy: { slug: "asc" },
    })

    const courseTable = allCourses.map((c) => {
        const dates = c.enrollments.map((e) => e.enrolledAt.getTime())
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().slice(0, 10) : "N/A"
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : "N/A"
        return {
            slug: c.slug,
            id: maskId(c.id),
            price: c.price,
            status: c.status,
            totalEnrollments: c.enrollments.length,
            minCreatedAt: minDate,
            maxCreatedAt: maxDate,
        }
    })

    console.log("Course Rows 0-20:")
    console.table(courseTable.slice(0, 21))
    console.log("Course Rows 21-41:")
    console.table(courseTable.slice(21))

    console.log("\n=== B.2: ENROLLMENT-LIKE TABLES TOTAL COUNTS ===")
    const [
        enrollmentCount,
        examSeriesEnrollmentCount,
        courseDemoBookingCount,
        demoBookingCount,
        demoStageSessionCount,
        subscriptionCount,
        pyqUnlockCount,
        pyqLeadCaptureCount,
    ] = await Promise.all([
        prisma.enrollment.count(),
        prisma.examSeriesEnrollment.count(),
        prisma.courseDemoBooking.count(),
        prisma.demoBooking.count(),
        prisma.demoStageSession.count(),
        prisma.subscription.count(),
        prisma.pyqUnlock.count(),
        prisma.pyqLeadCapture.count(),
    ])

    console.table([
        { Table: "Enrollment", Count: enrollmentCount },
        { Table: "ExamSeriesEnrollment", Count: examSeriesEnrollmentCount },
        { Table: "CourseDemoBooking", Count: courseDemoBookingCount },
        { Table: "DemoBooking", Count: demoBookingCount },
        { Table: "DemoStageSession", Count: demoStageSessionCount },
        { Table: "Subscription", Count: subscriptionCount },
        { Table: "PyqUnlock", Count: pyqUnlockCount },
        { Table: "PyqLeadCapture", Count: pyqLeadCaptureCount },
    ])

    console.log("\n=== B.4: LEAKED PAID ENROLLMENTS AUDIT (EXCLUDING TEST USERS) ===")
    // Leaked = enrollment exists on a paid course (price > 0), but no COMPLETED Payment exists for that user and course with amount > 0
    const paidCourses = allCourses.filter((c) => (c.price ?? 0) > 0)
    const leakRows: any[] = []

    for (const c of paidCourses) {
        // Exclude test users
        const realEnrollments = c.enrollments.filter((e) => !isTestUser(e.user))

        let verifiedCount = 0
        let leakedCount = 0

        for (const e of realEnrollments) {
            const completedPayment = await prisma.payment.findFirst({
                where: {
                    userId: e.userId,
                    status: "COMPLETED",
                    amount: { gt: 0 },
                    OR: [
                        { metadata: { path: ["courseId"], equals: c.id } },
                        { metadata: { path: ["courseSlug"], equals: c.slug } },
                    ],
                },
            })

            if (completedPayment) {
                verifiedCount++
            } else {
                leakedCount++
            }
        }

        leakRows.push({
            courseSlug: c.slug,
            courseId: maskId(c.id),
            price: c.price,
            realEnrollments: realEnrollments.length,
            verifiedPaid: verifiedCount,
            leakedWithoutPayment: leakedCount,
        })
    }

    console.table(leakRows)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
