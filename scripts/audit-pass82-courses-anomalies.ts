import { prisma } from "../lib/prisma";

async function run() {
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);
  console.log("=== STEP 2.a / 2.b / 2.c / 2.d: COMPREHENSIVE COURSE & ENROLLMENT AUDIT ===");

  // 1. Raw DB inspection for 'chapter-1-the-foundations-of-c-from-bare-metal-to-execution'
  const cRow = await prisma.$queryRawUnsafe(`
    SELECT id, slug, price, "isPremium", status
    FROM "Course"
    WHERE slug = 'chapter-1-the-foundations-of-c-from-bare-metal-to-execution'
  `);
  console.log("\n--- Raw DB Value for chapter-1 Course ---");
  console.log("Row:", cRow);
  if (Array.isArray(cRow) && cRow.length > 0) {
    console.log("typeof price in DB return:", typeof cRow[0].price, "value:", cRow[0].price);
  }

  // 2. All courses flags table with full id and full slug
  const allCourses = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      isPremium: true,
      price: true,
      status: true,
    },
    orderBy: { slug: "asc" },
  });

  console.log("\n--- ALL COURSES FLAGS (Table 1: Indices 0 - 20) ---");
  console.table(
    allCourses.slice(0, 21).map((c) => ({
      id: c.id,
      slug: c.slug,
      isPremium: c.isPremium,
      price: c.price,
      status: c.status,
    }))
  );

  console.log("\n--- ALL COURSES FLAGS (Table 2: Indices 21 - 41) ---");
  console.table(
    allCourses.slice(21).map((c) => ({
      id: c.id,
      slug: c.slug,
      isPremium: c.isPremium,
      price: c.price,
      status: c.status,
    }))
  );

  // 3. All series flags table
  const allSeries = await prisma.examSeries.findMany({
    select: {
      id: true,
      slug: true,
      isFree: true,
      isPro: true,
      isPublished: true,
    },
    orderBy: { slug: "asc" },
  });
  console.log("\n--- ALL EXAM SERIES FLAGS ---");
  console.table(allSeries);

  // 4. Enrollments & Payments cross-reference
  const coursesWithDetails = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      isPremium: true,
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
  });

  const fullAuditRows = [];
  const anomalyRows: any[] = [];

  for (const c of coursesWithDetails) {
    let completedPaymentsForCourseUser = 0;
    const dates = c.enrollments.map((e) => e.enrolledAt.getTime());
    const minCreatedAt = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().slice(0, 19) : "N/A";
    const maxCreatedAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().slice(0, 19) : "N/A";

    for (const e of c.enrollments) {
      const payment = await prisma.payment.findFirst({
        where: {
          userId: e.userId,
          status: "COMPLETED",
        },
      });
      if (payment) completedPaymentsForCourseUser++;
    }

    const unpaidEnrollments = c.enrollments.length - completedPaymentsForCourseUser;

    // Payments for zero-price course
    let completedPaymentsZeroPrice = 0;
    if ((c.price === 0 || !c.price) && !c.isPremium) {
      completedPaymentsZeroPrice = completedPaymentsForCourseUser;
    }

    fullAuditRows.push({
      id: c.id,
      slug: c.slug,
      price: c.price,
      isPremium: c.isPremium,
      status: c.status,
      totalEnrollments: c.enrollments.length,
      unpaidEnrollments,
      completedPaymentsCount: completedPaymentsForCourseUser,
      completedPaymentsZeroPrice,
      minCreatedAt,
      maxCreatedAt,
    });

    if ((c.price! > 0 || c.isPremium) && unpaidEnrollments > 0) {
      for (const e of c.enrollments) {
        const p = await prisma.payment.findFirst({
          where: { userId: e.userId, status: "COMPLETED" },
        });
        if (!p) {
          const user = await prisma.user.findUnique({ where: { id: e.userId } });
          let origin = "UNKNOWN";
          if (user?.email?.includes("@example.test") || user?.email?.includes("test_") || user?.id.startsWith("u-test") || user?.id.startsWith("test-")) {
            origin = "test script";
          } else if (user?.email?.endsWith("@aspirantbook.local") || user?.email?.endsWith("@trillionskills.com") || user?.email?.endsWith("@trillionskill.com")) {
            origin = "admin grant / seed";
          }

          anomalyRows.push({
            courseSlug: c.slug,
            courseId: c.id,
            price: c.price,
            enrollmentId: e.id,
            userId: e.userId,
            userEmail: user?.email,
            enrolledAt: e.enrolledAt.toISOString(),
            origin,
          });
        }
      }
    }
  }

  console.log("\n--- ENROLLMENT SUMMARY TABLE (Table 1: Indices 0 - 20) ---");
  console.table(fullAuditRows.slice(0, 21));

  console.log("\n--- ENROLLMENT SUMMARY TABLE (Table 2: Indices 21 - 41) ---");
  console.table(fullAuditRows.slice(21));

  console.log("\n--- STEP 2.d: ANOMALIES TABLE (PAID/PREMIUM WITH UNPAID ENROLLMENTS) ---");
  console.table(anomalyRows);
}

run()
  .catch((err) => {
    console.error("FATAL in audit-pass82-courses-anomalies:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
