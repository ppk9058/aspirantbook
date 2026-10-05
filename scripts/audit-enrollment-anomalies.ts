import { prisma } from "../lib/prisma"

async function main() {
    console.log("=== ALL COURSES ENROLLMENT AUDIT ===")
    const allCourses = await prisma.course.findMany({
        select: {
            id: true,
            slug: true,
            price: true,
            status: true,
            enrollments: {
                select: {
                    id: true,
                    userId: true,
                    enrolledAt: true,
                },
            },
        },
        orderBy: { slug: "asc" },
    })

    const courseSummary = []
    for (const c of allCourses) {
        if (c.enrollments.length === 0) continue

        const enrollDates = c.enrollments.map((e) => e.enrolledAt.getTime())
        const minDate = new Date(Math.min(...enrollDates)).toISOString()
        const maxDate = new Date(Math.max(...enrollDates)).toISOString()

        // Check completed payments for same user + course
        let completedPaymentsCount = 0
        for (const e of c.enrollments) {
            const payment = await prisma.payment.findFirst({
                where: {
                    userId: e.userId,
                    status: "COMPLETED",
                    OR: [
                        { metadata: { path: ["courseId"], equals: c.id } },
                        { metadata: { path: ["courseId"], equals: c.slug } },
                    ],
                },
            })
            if (payment) completedPaymentsCount++
        }

        courseSummary.push({
            id: c.id.slice(0, 8),
            slug: c.slug,
            price: c.price,
            status: c.status,
            totalEnrollments: c.enrollments.length,
            minCreatedAt: minDate.slice(0, 19),
            maxCreatedAt: maxDate.slice(0, 19),
            completedPayments: completedPaymentsCount,
        })
    }
    console.table(courseSummary)

    console.log("\n=== DETAILED ENROLLMENTS FOR COURSE '3' ===")
    const course3 = await prisma.course.findFirst({
        where: { slug: "3" },
        include: {
            enrollments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { enrolledAt: "asc" },
            },
        },
    })

    if (course3) {
        const rows3 = []
        for (const e of course3.enrollments) {
            const p = await prisma.payment.findFirst({
                where: {
                    userId: e.userId,
                    OR: [
                        { metadata: { path: ["courseId"], equals: course3.id } },
                        { metadata: { path: ["courseId"], equals: course3.slug } },
                    ],
                },
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    externalId: true,
                },
            })
            rows3.push({
                enrollmentId: e.id.slice(0, 8),
                maskedUserId: e.userId.slice(0, 8),
                userEmailDomain: e.user?.email ? e.user.email.split("@")[1] : "none",
                userName: e.user?.name ? e.user.name.slice(0, 8) : "none",
                role: e.user?.role,
                enrolledAt: e.enrolledAt.toISOString().slice(0, 19),
                hasPayment: !!p,
                paymentStatus: p?.status || "NONE",
                paymentAmt: p?.amount ?? null,
            })
        }
        console.table(rows3)
    }

    console.log("\n=== DETAILED ENROLLMENTS FOR COURSE '72nd-bpsc-prelims-current-affairs' ===")
    const course72 = await prisma.course.findFirst({
        where: { slug: "72nd-bpsc-prelims-current-affairs" },
        include: {
            enrollments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { enrolledAt: "asc" },
            },
        },
    })

    if (course72) {
        const rows72 = []
        for (const e of course72.enrollments) {
            const p = await prisma.payment.findFirst({
                where: {
                    userId: e.userId,
                    OR: [
                        { metadata: { path: ["courseId"], equals: course72.id } },
                        { metadata: { path: ["courseId"], equals: course72.slug } },
                    ],
                },
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    externalId: true,
                },
            })
            rows72.push({
                enrollmentId: e.id.slice(0, 8),
                maskedUserId: e.userId.slice(0, 8),
                userEmailDomain: e.user?.email ? e.user.email.split("@")[1] : "none",
                userName: e.user?.name ? e.user.name.slice(0, 8) : "none",
                role: e.user?.role,
                enrolledAt: e.enrolledAt.toISOString().slice(0, 19),
                hasPayment: !!p,
                paymentStatus: p?.status || "NONE",
                paymentAmt: p?.amount ?? null,
            })
        }
        console.table(rows72)
    }
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
