import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP V4 & V5: CANDIDATE DELETE LISTS, CONSTRAINTS & DEPENDENCIES ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // 1. Audit student1..5 and mockstudent1..5
  const mockStudents = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "student1@test.com", "student2@test.com", "student3@test.com", "student4@test.com", "student5@test.com",
          "mockstudent1@test.com", "mockstudent2@test.com", "mockstudent3@test.com", "mockstudent4@test.com", "mockstudent5@test.com"
        ]
      }
    },
    select: {
      id: true,
      role: true,
      createdAt: true
    }
  });

  console.log(`\n--- V4: student1..5 / mockstudent1..5 in database (${mockStudents.length} found) ---`);
  console.table(mockStudents);

  // 2. Identify candidate users strictly matching V3 allowed patterns
  // Patterns: test_%, attacker_%, cltest_%, %@example.test, %@aspirantbook.local, %@test.local
  // Excluding ADMIN and TEACHER
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
    select: {
      id: true,
      role: true,
      createdAt: true
    },
    orderBy: { id: "asc" }
  });

  console.log(`\n--- V5: Candidate Users for Cleanup (${candidateUsers.length} total) ---`);
  console.table(candidateUsers.map(u => ({ id: u.id, role: u.role, createdAt: u.createdAt.toISOString() })));

  const candidateUserIds = candidateUsers.map(u => u.id);

  // 3. Candidate dependent rows for these candidate users
  const payments = await prisma.payment.findMany({
    where: { userId: { in: candidateUserIds } },
    select: { id: true, userId: true, amount: true, status: true, externalId: true },
    orderBy: { id: "asc" }
  });
  console.log(`\n--- Candidate Payments to Delete (${payments.length} total) ---`);
  console.table(payments);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: candidateUserIds } },
    select: { id: true, userId: true, courseId: true, enrolledAt: true },
    orderBy: { id: "asc" }
  });
  console.log(`\n--- Candidate Enrollments to Delete (${enrollments.length} total) ---`);
  console.table(enrollments);

  const progresses = await prisma.progress.findMany({
    where: { userId: { in: candidateUserIds } },
    select: { id: true, userId: true, lessonId: true, completed: true },
    orderBy: { id: "asc" }
  });
  console.log(`\n--- Candidate Progress rows to Delete (${progresses.length} total) ---`);
  console.table(progresses);

  const examAttempts = await prisma.examAttempt.findMany({
    where: { userId: { in: candidateUserIds } },
    select: { id: true, userId: true, testId: true, status: true },
    orderBy: { id: "asc" }
  });
  console.log(`\n--- Candidate ExamAttempts to Delete (${examAttempts.length} total) ---`);
  console.table(examAttempts);

  // 4. Candidate ExamSeries (only created-by-teacher-test-route-% and audit-series-%)
  const candidateSeries = await prisma.examSeries.findMany({
    where: {
      OR: [
        { id: { startsWith: "created-by-teacher-test-route-" } },
        { id: { startsWith: "cuid_series_audit_" } },
        { slug: { startsWith: "created-by-teacher-test-route-" } },
        { slug: { startsWith: "audit-series-" } },
      ]
    },
    select: { id: true, slug: true, isFree: true, isPro: true, isPublished: true },
    orderBy: { id: "asc" }
  });
  console.log(`\n--- Candidate ExamSeries to Delete (${candidateSeries.length} total) ---`);
  console.table(candidateSeries);

  // 5. Inspect pg_constraint foreign keys referencing User, Payment, Enrollment, ExamSeries
  const fkConstraints: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE ccu.table_name IN ('User', 'Payment', 'Enrollment', 'ExamSeries')
    ORDER BY ccu.table_name, tc.table_name
  `);
  console.log("\n--- FOREIGN KEY CONSTRAINTS REFERENCING TARGET TABLES ---");
  console.table(fkConstraints);
}

run()
  .catch((err) => {
    console.error("FATAL in test-v4-v5-delete-audit:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
