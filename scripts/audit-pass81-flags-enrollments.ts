import { prisma } from "../lib/prisma";

function maskId(id: string) {
  return id.length > 8 ? id.slice(0, 8) + "..." : id;
}

async function run() {
  console.log("=== 1. COURSE FLAGS (REAL SCHEMA COLUMNS ONLY) ===");
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      isPremium: true,
      price: true,
      status: true,
    },
    orderBy: { slug: "asc" },
  });

  console.table(
    courses.map((c) => ({
      id: maskId(c.id),
      slug: c.slug,
      isPremium: c.isPremium,
      price: c.price,
      status: c.status,
    }))
  );

  console.log("\n=== 2. EXAM SERIES FLAGS (REAL SCHEMA COLUMNS ONLY) ===");
  const series = await prisma.examSeries.findMany({
    select: {
      id: true,
      slug: true,
      isFree: true,
      isPro: true,
      isPublished: true,
    },
    orderBy: { slug: "asc" },
  });

  console.table(
    series.map((s) => ({
      id: maskId(s.id),
      slug: s.slug,
      isFree: s.isFree,
      isPro: s.isPro,
      isPublished: s.isPublished,
    }))
  );

  console.log("\n=== 3. ALL COURSES ENROLLMENT AUDIT TABLE ===");
  const allCoursesWithEnrollments = await prisma.course.findMany({
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
  });

  const enrollmentRows = [];

  for (const c of allCoursesWithEnrollments) {
    const dates = c.enrollments.map((e) => e.enrolledAt.getTime());
    const minCreatedAt = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().slice(0, 19) : "N/A";
    const maxCreatedAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().slice(0, 19) : "N/A";

    // Count enrollments that have a COMPLETED Payment row for that exact user
    let completedPaymentCount = 0;
    for (const e of c.enrollments) {
      const payment = await prisma.payment.findFirst({
        where: {
          userId: e.userId,
          status: "COMPLETED",
        },
      });
      if (payment) {
        completedPaymentCount++;
      }
    }

    enrollmentRows.push({
      id: maskId(c.id),
      slug: c.slug,
      price: c.price,
      status: c.status,
      totalEnrollments: c.enrollments.length,
      minCreatedAt,
      maxCreatedAt,
      completedPaymentCount,
    });
  }

  console.table(enrollmentRows);
}

run()
  .catch((err) => {
    console.error("Error in audit-pass81-flags-enrollments:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
