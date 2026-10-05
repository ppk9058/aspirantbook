import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP V3: AUDIT OF isTestUser AND PATTERNS IN scripts/dry-run-test-cleanup.ts ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // Count users by role
  const roleCounts: any[] = await prisma.$queryRawUnsafe(`
    SELECT role, COUNT(*)::int as count
    FROM "User"
    GROUP BY role
    ORDER BY role ASC
  `);
  console.log("\n--- USER COUNTS BY ROLE ---");
  console.table(roleCounts);

  // Print all ADMIN and TEACHER users (id and role only)
  const staffUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "TEACHER"] }
    },
    select: {
      id: true,
      role: true
    },
    orderBy: { role: "asc" }
  });
  console.log(`\n--- ALL ADMIN & TEACHER USERS (${staffUsers.length} Total) ---`);
  console.table(staffUsers);

  // Evaluate candidate test users according to V3 exact rules:
  // Allowed patterns (on id or email): test_%, attacker_%, cltest_%, %@example.test, %@aspirantbook.local, %@test.local
  // Forbidden to match: role ADMIN or TEACHER; Payment razorpay not from test script; activity after 2026-10-05 not from test script
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      payments: {
        select: {
          id: true,
          externalId: true,
          amount: true,
          status: true,
          createdAt: true
        }
      }
    }
  });

  const v3MatchingUsers: any[] = [];
  const staffProtected: any[] = [];
  const excludedUsers: any[] = [];

  for (const u of allUsers) {
    const email = u.email || "";
    const id = u.id;

    const matchesIdPattern = id.startsWith("test_") || id.startsWith("attacker_") || id.startsWith("cltest_");
    const matchesEmailPattern = email.startsWith("test_") || email.startsWith("attacker_") || email.startsWith("cltest_") ||
      email.endsWith("@example.test") || email.endsWith("@aspirantbook.local") || email.endsWith("@test.local");

    if (matchesIdPattern || matchesEmailPattern) {
      if (u.role === "ADMIN" || u.role === "TEACHER") {
        staffProtected.push({ id: u.id, role: u.role });
      } else {
        v3MatchingUsers.push({
          id: u.id,
          role: u.role,
          paymentsCount: u.payments.length
        });
      }
    } else {
      excludedUsers.push({ id: u.id, role: u.role });
    }
  }

  console.log(`\n--- SUMMARY OF USERS MATCHING V3 PATTERNS ---`);
  console.log("Total Users:", allUsers.length);
  console.log("Protected Staff (Forbidden):", staffProtected.length);
  console.log("Matching Candidate Test Users (Non-Staff):", v3MatchingUsers.length);
  console.log("Non-Matching Users (Preserved):", excludedUsers.length);
}

run()
  .catch((err) => {
    console.error("FATAL in test-v3-is-test-user-audit:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
