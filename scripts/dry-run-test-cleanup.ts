import { prisma } from "../lib/prisma"

// Real production users to protect:
// Never touch users with real domain @trillionskills.com or original production users
const PROTECTED_EMAILS = [
    "trillionskill@gmail.com",
    "admin@trillionskill.com",
]

async function main() {
    console.log("=== C.4: DRY RUN OF PROPOSED TEST DATA CLEANUP (FK ORDER) ===")

    // Find all test users matching test patterns
    const testUsers = await prisma.user.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { id: { startsWith: "u-" } },
                        { id: { startsWith: "test" } },
                        { id: { startsWith: "usr_test" } },
                        { email: { endsWith: "@example.test" } },
                        { email: { endsWith: "@internal.test" } },
                        { email: { endsWith: "@test.local" } },
                        { email: { endsWith: "@example.com" } },
                        { email: { contains: "perf_student" } },
                        { email: { contains: "audit_student" } },
                        { email: { contains: "test_wh" } },
                        { email: { contains: "test_user" } },
                    ],
                },
                { email: { notIn: PROTECTED_EMAILS } },
            ],
        },
        select: { id: true, email: true },
    })

    const testUserIds = testUsers.map((u) => u.id)
    console.log(`Found ${testUserIds.length} candidate test users for cleanup.`)

    // Count in foreign-key order
    const [
        demoChatMessages,
        demoStageSessions,
        courseDemoBookings,
        demoBookings,
        examAttemptAnswers,
        examAttempts,
        examSeriesEnrollments,
        progress,
        payments,
        enrollments,
        accounts,
    ] = await Promise.all([
        prisma.demoChatMessage.count({ where: { userId: { in: testUserIds } } }),
        prisma.demoStageSession.count({ where: { userId: { in: testUserIds } } }),
        prisma.courseDemoBooking.count({ where: { userId: { in: testUserIds } } }),
        prisma.demoBooking.count({ where: { studentId: { in: testUserIds } } }),
        prisma.examAttemptAnswer.count({ where: { attempt: { userId: { in: testUserIds } } } }),
        prisma.examAttempt.count({ where: { userId: { in: testUserIds } } }),
        prisma.examSeriesEnrollment.count({ where: { userId: { in: testUserIds } } }),
        prisma.progress.count({ where: { userId: { in: testUserIds } } }),
        prisma.payment.count({ where: { userId: { in: testUserIds } } }),
        prisma.enrollment.count({ where: { userId: { in: testUserIds } } }),
        prisma.account.count({ where: { userId: { in: testUserIds } } }),
    ])

    console.log("\n[DRY RUN] Rows that would be deleted in FK order:")
    console.table([
        { Order: 1, Table: "DemoChatMessage", RowsToDelete: demoChatMessages },
        { Order: 2, Table: "DemoStageSession", RowsToDelete: demoStageSessions },
        { Order: 3, Table: "CourseDemoBooking", RowsToDelete: courseDemoBookings },
        { Order: 4, Table: "DemoBooking", RowsToDelete: demoBookings },
        { Order: 5, Table: "ExamAttemptAnswer", RowsToDelete: examAttemptAnswers },
        { Order: 6, Table: "ExamAttempt", RowsToDelete: examAttempts },
        { Order: 7, Table: "ExamSeriesEnrollment", RowsToDelete: examSeriesEnrollments },
        { Order: 8, Table: "Progress", RowsToDelete: progress },
        { Order: 9, Table: "Payment", RowsToDelete: payments },
        { Order: 10, Table: "Enrollment", RowsToDelete: enrollments },
        { Order: 11, Table: "Account", RowsToDelete: accounts },
        { Order: 12, Table: "User", RowsToDelete: testUserIds.length },
    ])

    console.log("\nProposed SQL Statements (WAITING FOR 'APPROVED cleanup'):")
    console.log(`
-- 1. DemoChatMessage
DELETE FROM "DemoChatMessage" WHERE "userId" IN (...);

-- 2. DemoStageSession
DELETE FROM "DemoStageSession" WHERE "userId" IN (...);

-- 3. CourseDemoBooking
DELETE FROM "CourseDemoBooking" WHERE "userId" IN (...);

-- 4. DemoBooking
DELETE FROM "DemoBooking" WHERE "userId" IN (...);

-- 5. ExamAttemptAnswer
DELETE FROM "ExamAttemptAnswer" WHERE "attemptId" IN (SELECT id FROM "ExamAttempt" WHERE "userId" IN (...));

-- 6. ExamAttempt
DELETE FROM "ExamAttempt" WHERE "userId" IN (...);

-- 7. ExamSeriesEnrollment
DELETE FROM "ExamSeriesEnrollment" WHERE "userId" IN (...);

-- 8. Progress
DELETE FROM "Progress" WHERE "userId" IN (...);

-- 9. Payment
DELETE FROM "Payment" WHERE "userId" IN (...);

-- 10. Enrollment
DELETE FROM "Enrollment" WHERE "userId" IN (...);

-- 11. Account
DELETE FROM "Account" WHERE "userId" IN (...);

-- 12. User
DELETE FROM "User" WHERE id IN (...);
    `)
    console.log("[DRY RUN COMPLETE] Zero database rows modified or deleted.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
