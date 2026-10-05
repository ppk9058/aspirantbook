import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP 3: READ-ONLY EVIDENCE SUITE (DEV DB STRICT READ-ONLY) ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // 3b. Current indexes and constraints on CouponRedemption on Dev
  const indexes: any[] = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'CouponRedemption' ORDER BY indexname;
  `);
  console.log("\n3b. Indexes on CouponRedemption (Dev):");
  console.table(indexes);

  const constraints: any[] = await prisma.$queryRawUnsafe(`
    SELECT conname, pg_get_constraintdef(c.oid) as definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'CouponRedemption'
    ORDER BY conname;
  `);
  console.log("3b. Constraints on CouponRedemption (Dev):");
  console.table(constraints);

  // 3c. Remaining users by role & the 16 FREE users
  const roleCounts: any[] = await prisma.$queryRawUnsafe(`
    SELECT role, COUNT(*)::int as cnt FROM "User" GROUP BY role ORDER BY cnt DESC;
  `);
  console.log("\n3c. Remaining User Counts by Role (Dev):");
  console.table(roleCounts);

  const freeUsers = await prisma.user.findMany({
    where: { role: "FREE" },
    select: { id: true, createdAt: true, email: true },
    orderBy: { createdAt: "asc" }
  });

  const freeUserAudit: any[] = [];
  for (const u of freeUsers) {
    const hasPay = await prisma.payment.count({ where: { userId: u.id } });
    const hasEnr = await prisma.enrollment.count({ where: { userId: u.id } });
    const hasProg = await prisma.progress.count({ where: { userId: u.id } });
    const hasAtm = await prisma.examAttempt.count({ where: { userId: u.id } });

    const isTestPattern = u.id.startsWith("test_") || u.id.startsWith("cltest_") || u.id.startsWith("attacker_") ||
      (u.email && (u.email.startsWith("test_") || u.email.endsWith("@example.test") || u.email.endsWith("@test.local")));

    freeUserAudit.push({
      userId: u.id,
      createdAt: u.createdAt.toISOString(),
      matchesTestPattern: isTestPattern ? "YES" : "NO",
      hasPayments: hasPay > 0,
      hasEnrollments: hasEnr > 0,
      hasProgress: hasProg > 0,
      hasExamAttempts: hasAtm > 0,
      origin: u.id.startsWith("usr_") || u.id.startsWith("cmu") ? "Manual/OAuth/Seed" : "UNKNOWN"
    });
  }
  console.log("3c. 16 Remaining FREE Users Audit:");
  console.table(freeUserAudit);

  // 3d. Live audit of the 23 unpaid enrollment anomaly IDs
  const targetEnrollmentIds = [
    "cmujcy10b0002xp8vkrpgsto9", "cmujgio4i0003xpl3du8xvreo", "cmulbgwhy0016xpiu6n6jb1oh",
    "cmullssny001bxp6e19vruxy9", "cmusi48760006xp5bfib32wg1", "cmusi5iwo0009xp5bvxk18ajs",
    "cmusjt13h001jxp5b9zgit4ma", "cmuslwlgz000pxp9jtdnps1fe", "cmusmxfbb0013xp9jnrzy2r16",
    "cmusnokp1001oxp9jxugnvmlv", "cmusikvav000bxp5btxqzjulh", "cmusommm00006xpjh2zkzl7eg",
    "cmusommm00005xpjhxn2t2sq7", "cmuua5xzb0001xpujh2hxa5v1", "cmulho5zd000mxp6en8lbcvjj",
    "cmuqubqyc004nxpk9ncg4mid0", "cmuquadpj004jxpk9hyxv7p2x", "cmujddl830005xp8vt33y3jsg",
    "cmulanjgk000xxpiuh4om0nbi", "cmuutq3wj000rxptboo8p3zb0", "cmujfb6h90007xp8vkat30e7a",
    "cmulcaa6j001axpiu78tche28", "cmulozsq30002xph4bvqs5o63"
  ];

  const d2Audit: any[] = [];
  for (const enrId of targetEnrollmentIds) {
    const enr = await prisma.enrollment.findUnique({
      where: { id: enrId },
      include: {
        user: { select: { id: true, role: true } },
        course: { select: { id: true, slug: true, price: true } }
      }
    });

    if (!enr) {
      d2Audit.push({
        enrollmentId: enrId,
        courseSlug: "DELETED",
        userId: "DELETED_IN_8.5",
        role: "DELETED",
        stillExists: "NO",
        paymentExists: "NO",
        grantSource: "Deleted during 8.5 cleanup of test users"
      });
      continue;
    }

    const pay = await prisma.payment.findFirst({
      where: { userId: enr.user.id, status: "COMPLETED" }
    });

    d2Audit.push({
      enrollmentId: enr.id,
      courseSlug: enr.course.slug,
      userId: enr.user.id,
      role: enr.user.role,
      stillExists: "YES",
      paymentExists: pay ? "YES" : "NO",
      grantSource: enr.user.role === "ADMIN" || enr.user.role === "TEACHER" ? "STAFF_DIRECT" : "FREE_ENROLL_ROUTE"
    });
  }

  console.log("\n3d. Live Audit of 23 Unpaid Enrollment Anomaly IDs:");
  console.table(d2Audit);
}

run()
  .catch((err) => {
    console.error("FATAL in step3-readonly-evidence:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
