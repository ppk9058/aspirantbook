import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP V1: READ-ONLY TRANSACTION VERIFICATION & CURRENT DB AUDIT ===");

  // Enforce read-only transaction on this session
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // Prove that an INSERT in the same connection fails
  let insertFailed = false;
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO "Course" (id, title, slug, price, "isPremium", status, "updatedAt") VALUES ('fail_probe', 'Probe', 'probe', 0, false, 'DRAFT', NOW())`);
  } catch (err: any) {
    insertFailed = true;
    console.log("✓ PROOF: Read-only transaction rejected INSERT as expected:");
    console.log("  Error message:", err.message);
  }

  if (!insertFailed) {
    throw new Error("CRITICAL SECURITY FAILURE: Read-only transaction did NOT block INSERT!");
  }

  // Database metadata & host inspection
  const meta: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      current_database() as db_name,
      inet_server_addr() as server_ip,
      inet_server_port() as server_port
  `);
  console.log("\n--- Database Metadata ---");
  console.log("Current DB:", meta[0]?.db_name);
  console.log("Server IP:", meta[0]?.server_ip);
  console.log("Server Port:", meta[0]?.server_port);

  // Table counts
  const counts: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*) FROM "User")::int as user_count,
      (SELECT COUNT(*) FROM "Course")::int as course_count,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollment_count,
      (SELECT COUNT(*) FROM "Payment")::int as payment_count,
      (SELECT COUNT(*) FROM "Coupon")::int as coupon_count,
      (SELECT COUNT(*) FROM "CouponRedemption")::int as coupon_redemption_count,
      (SELECT COUNT(*) FROM "ExamSeries")::int as exam_series_count,
      (SELECT COUNT(*) FROM "ExamAttempt")::int as exam_attempt_count,
      (SELECT COUNT(*) FROM "Progress")::int as lesson_progress_count
  `);
  console.log("\n--- Live Table Row Counts ---");
  console.table(counts);

  // Print all courses
  const allCourses = await prisma.course.findMany({
    select: {
      id: true,
      slug: true,
      price: true,
      status: true,
      isPremium: true,
    },
    orderBy: { slug: "asc" },
  });

  console.log(`\n--- ALL COURSES (${allCourses.length} Total) ---`);
  console.log("Table 1 (0 to 14):");
  console.table(allCourses.slice(0, 15).map(c => ({
    id: c.id,
    slug: c.slug,
    price: c.price,
    typeofPrice: typeof c.price,
    status: c.status,
    isPremium: c.isPremium,
  })));

  console.log("Table 2 (15 to 29):");
  console.table(allCourses.slice(15, 30).map(c => ({
    id: c.id,
    slug: c.slug,
    price: c.price,
    typeofPrice: typeof c.price,
    status: c.status,
    isPremium: c.isPremium,
  })));

  console.log("Table 3 (30 to 41):");
  console.table(allCourses.slice(30).map(c => ({
    id: c.id,
    slug: c.slug,
    price: c.price,
    typeofPrice: typeof c.price,
    status: c.status,
    isPremium: c.isPremium,
  })));

  // Print all ExamSeries
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

  console.log(`\n--- ALL EXAM SERIES (${allSeries.length} Total) ---`);
  console.log("Table 1 (0 to 11):");
  console.table(allSeries.slice(0, 12));
  console.log("Table 2 (12 to 23):");
  console.table(allSeries.slice(12));

  // Specific Course & Series Checks
  const bpsc72 = allCourses.find(c => c.slug === "72nd-bpsc-prelims-current-affairs");
  console.log("\n--- Specific Existence Checks ---");
  console.log("72nd-bpsc-prelims-current-affairs exists:", !!bpsc72);
  if (bpsc72) {
    console.log("  id:", bpsc72.id, "price:", bpsc72.price, "isPremium:", bpsc72.isPremium);
  }

  const cChap1 = allCourses.find(c => c.slug === "chapter-1-the-foundations-of-c-from-bare-metal-to-execution");
  console.log("chapter-1-the-foundations-of-c-from-bare-metal-to-execution exists:", !!cChap1);
  if (cChap1) {
    console.log("  id:", cChap1.id, "price:", cChap1.price, "typeof price:", typeof cChap1.price);
  }

  const teacherTestSeries = allSeries.filter(s => s.id.startsWith("created-by-teacher-test-route-") || s.slug.startsWith("created-by-teacher-test-route-"));
  console.log("created-by-teacher-test-route-* rows count:", teacherTestSeries.length);

  const auditSeries = allSeries.filter(s => s.id.startsWith("cuid_series_audit_") || s.slug.startsWith("audit-series-"));
  console.log("audit-series-* rows count:", auditSeries.length);
}

run()
  .catch((err) => {
    console.error("FATAL in test-v1-read-only-gate:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
