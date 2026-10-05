import { PrismaClient } from "@prisma/client";

// Connect directly using DIRECT_URL to avoid connection-pooler read-only transaction defaults
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL }
  }
});

async function run() {
  console.log("=== EXECUTING OWNER APPROVED CLEANUP OF 53 TEST ACCOUNTS ===");

  // Enforce read_write mode on this direct connection
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = off`);

  // 1. Identify exactly the 53 non-staff candidate accounts matching the V3 patterns
  const candidateUsers = await prisma.user.findMany({
    where: {
      role: { notIn: ["ADMIN", "TEACHER"] },
      OR: [
        { id: { startsWith: "test_" } },
        { id: { startsWith: "attacker_" } },
        { id: { startsWith: "cltest_" } },
        { email: { startsWith: "test_" } },
        { email: { startsWith: "attacker_" } },
        { email: { startsWith: "cltest_" } },
        { email: { endsWith: "@example.test" } },
        { email: { endsWith: "@aspirantbook.local" } },
        { email: { endsWith: "@test.local" } },
      ]
    },
    select: { id: true, role: true },
    orderBy: { id: "asc" }
  });

  const targetUserIds = candidateUsers.map(u => u.id);
  console.log(`Found ${targetUserIds.length} candidate user IDs to clean up.`);
  if (targetUserIds.length !== 53) {
    throw new Error(`SAFETY ASSERTION FAILED: Expected 53 candidate users, but found ${targetUserIds.length}! Halting.`);
  }

  // 2. Before counts
  const beforeCounts: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM "User")::int as user_count,
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "Progress")::int as progress_count,
      (SELECT COUNT(*) FROM "ExamAttempt")::int as attempt_count,
      (SELECT COUNT(*) FROM "Course")::int as course_count
  `);
  console.log("\n--- BEFORE ROW COUNTS ON DEV DB ---");
  console.table(beforeCounts);

  // 3. Candidate series IDs to clean up (only test series)
  const candidateSeries = await prisma.examSeries.findMany({
    where: {
      OR: [
        { id: { startsWith: "created-by-teacher-test-route-" } },
        { id: { startsWith: "cuid_series_audit_" } },
        { slug: { startsWith: "created-by-teacher-test-route-" } },
        { slug: { startsWith: "audit-series-" } },
      ]
    },
    select: { id: true }
  });
  const targetSeriesIds = candidateSeries.map(s => s.id);
  console.log(`Found ${targetSeriesIds.length} test series IDs to clean up.`);

  // 4. Execute atomic transaction with exact recorded ID lists
  await prisma.$transaction(async (tx) => {
    // A. Exam attempts and answers
    const delAnswers = await tx.examAttemptAnswer.deleteMany({
      where: { attempt: { userId: { in: targetUserIds } } }
    });
    const delAttempts = await tx.examAttempt.deleteMany({
      where: { userId: { in: targetUserIds } }
    });

    // B. Test series enrollments and child tests
    const delSeriesEnr = await tx.examSeriesEnrollment.deleteMany({
      where: {
        OR: [
          { userId: { in: targetUserIds } },
          { seriesId: { in: targetSeriesIds } }
        ]
      }
    });
    const delTests = await tx.examTest.deleteMany({
      where: { seriesId: { in: targetSeriesIds } }
    });
    const delSeries = await tx.examSeries.deleteMany({
      where: { id: { in: targetSeriesIds } }
    });

    // C. Demo bookings and chat messages
    const delDemoChat = await tx.demoChatMessage.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delDemoStage = await tx.demoStageSession.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delCourseDemo = await tx.courseDemoBooking.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delDemo = await tx.demoBooking.deleteMany({
      where: { studentId: { in: targetUserIds } }
    });

    // D. Progress, Payment, Enrollment
    const delProgress = await tx.progress.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delCouponRedemption = await tx.couponRedemption.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delPayments = await tx.payment.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delEnrollments = await tx.enrollment.deleteMany({
      where: { userId: { in: targetUserIds } }
    });

    // E. Accounts & Users
    const delAccounts = await tx.account.deleteMany({
      where: { userId: { in: targetUserIds } }
    });
    const delUsers = await tx.user.deleteMany({
      where: { id: { in: targetUserIds } }
    });

    console.log("\n--- TRANSACTION DELETE SUMMARY ---");
    console.table([
      { entity: "ExamAttemptAnswer", deleted: delAnswers.count },
      { entity: "ExamAttempt", deleted: delAttempts.count },
      { entity: "ExamSeriesEnrollment", deleted: delSeriesEnr.count },
      { entity: "ExamTest", deleted: delTests.count },
      { entity: "ExamSeries", deleted: delSeries.count },
      { entity: "DemoChatMessage", deleted: delDemoChat.count },
      { entity: "DemoStageSession", deleted: delDemoStage.count },
      { entity: "CourseDemoBooking", deleted: delCourseDemo.count },
      { entity: "DemoBooking", deleted: delDemo.count },
      { entity: "Progress", deleted: delProgress.count },
      { entity: "CouponRedemption", deleted: delCouponRedemption.count },
      { entity: "Payment", deleted: delPayments.count },
      { entity: "Enrollment", deleted: delEnrollments.count },
      { entity: "Account", deleted: delAccounts.count },
      { entity: "User", deleted: delUsers.count },
    ]);

    if (delUsers.count !== 53) {
      throw new Error(`ASSERTION FAILED: Deleted ${delUsers.count} users instead of 53! Rolling back.`);
    }
  });

  // 5. After counts
  const afterCounts: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM "User")::int as user_count,
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "Progress")::int as progress_count,
      (SELECT COUNT(*) FROM "ExamAttempt")::int as attempt_count,
      (SELECT COUNT(*) FROM "Course")::int as course_count
  `);
  console.log("\n--- AFTER ROW COUNTS ON DEV DB ---");
  console.table(afterCounts);
  console.log("✓ CLEANUP TRANSACTION COMMITTED SUCCESSFULLY.");
}

run()
  .catch((err) => {
    console.error("FATAL in cleanup-53-accounts:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
