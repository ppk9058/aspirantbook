import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP D1: BREAKDOWN OF 53 CANDIDATE CLEANUP USERS BY PATTERN ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  const patterns = [
    { name: "test_%", filter: (id: string, email: string) => id.startsWith("test_") || email.startsWith("test_") },
    { name: "attacker_%", filter: (id: string, email: string) => id.startsWith("attacker_") || email.startsWith("attacker_") },
    { name: "cltest_%", filter: (id: string, email: string) => id.startsWith("cltest_") || email.startsWith("cltest_") },
    { name: "%@example.test", filter: (id: string, email: string) => email.endsWith("@example.test") },
    { name: "%@aspirantbook.local", filter: (id: string, email: string) => email.endsWith("@aspirantbook.local") },
    { name: "%@test.local", filter: (id: string, email: string) => email.endsWith("@test.local") },
  ];

  const allUsers = await prisma.user.findMany({
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
      email: true,
      role: true,
      createdAt: true,
      payments: { select: { id: true } },
      enrollments: { select: { id: true } },
      progress: { select: { id: true } },
      examAttempts: { select: { id: true } },
    },
    orderBy: { id: "asc" }
  });

  console.log(`Total candidate users found: ${allUsers.length}`);

  for (const pat of patterns) {
    const matching = allUsers.filter(u => pat.filter(u.id, u.email || ""));
    console.log(`\n--- Pattern: ${pat.name} (${matching.length} users) ---`);
    if (matching.length > 0) {
      console.table(matching.map(u => ({
        id: u.id,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        paymentsCount: u.payments.length,
        enrollmentsCount: u.enrollments.length,
        progressCount: u.progress.length,
        examAttemptsCount: u.examAttempts.length,
      })));
    }
  }
}

run()
  .catch((err) => {
    console.error("FATAL in test-d1-cleanup-candidates-breakdown:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
