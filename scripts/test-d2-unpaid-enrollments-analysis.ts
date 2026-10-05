import { prisma } from "../lib/prisma";

async function run() {
  console.log("=== STEP D2: QUERY-BACKED CLASSIFICATION OF THE 23 UNPAID ENROLLMENTS ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  // Anomaly enrollment IDs on paid/premium courses
  const targetEnrollmentIds = [
    "cmujcy10b0002xp8vkrpgsto9",
    "cmujgio4i0003xpl3du8xvreo",
    "cmulbgwhy0016xpiu6n6jb1oh",
    "cmullssny001bxp6e19vruxy9",
    "cmusi48760006xp5bfib32wg1",
    "cmusi5iwo0009xp5bvxk18ajs",
    "cmusjt13h001jxp5b9zgit4ma",
    "cmuslwlgz000pxp9jtdnps1fe",
    "cmusmxfbb0013xp9jnrzy2r16",
    "cmusnokp1001oxp9jxugnvmlv",
    "cmusikvav000bxp5btxqzjulh",
    "cmusommm00006xpjh2zkzl7eg",
    "cmusommm00005xpjhxn2t2sq7",
    "cmuua5xzb0001xpujh2hxa5v1",
    "cmulho5zd000mxp6en8lbcvjj",
    "cmuqubqyc004nxpk9ncg4mid0",
    "cmuquadpj004jxpk9hyxv7p2x",
    "cmujddl830005xp8vt33y3jsg",
    "cmulanjgk000xxpiuh4om0nbi",
    "cmuutq3wj000rxptboo8p3zb0",
    "cmujfb6h90007xp8vkat30e7a",
    "cmulcaa6j001axpiu78tche28",
    "cmulozsq30002xph4bvqs5o63"
  ];

  const results = [];

  for (const enrId of targetEnrollmentIds) {
    const enr = await prisma.enrollment.findUnique({
      where: { id: enrId },
      include: {
        user: { select: { id: true, role: true, email: true } },
        course: { select: { id: true, slug: true, price: true } }
      }
    });

    if (!enr) {
      results.push({
        enrollmentId: enrId,
        courseSlug: "N/A",
        userId: "N/A",
        userRole: "N/A",
        matchesTestPattern: "NO",
        hasCompletedPayment: "NO",
        classification: "NOT FOUND"
      });
      continue;
    }

    const email = enr.user.email || "";
    const uid = enr.user.id;
    const isTest = uid.startsWith("test_") || uid.startsWith("cltest_") || uid.startsWith("attacker_") ||
      email.startsWith("test_") || email.endsWith("@example.test") || email.endsWith("@test.local");

    const payment = await prisma.payment.findFirst({
      where: {
        userId: uid,
        status: "COMPLETED"
      }
    });

    let classification = "UNKNOWN";
    if (enr.user.role === "ADMIN" || enr.user.role === "TEACHER") {
      classification = `STAFF ACCOUNT (${enr.user.role})`;
    } else if (isTest) {
      classification = "TEST SCRIPT ARTIFACT";
    } else if (email.endsWith("@aspirantbook.local")) {
      classification = "SEED STUDENT ACCOUNT";
    } else if (email.includes("student@trillionskills.com")) {
      classification = "PLATFORM DEMO STUDENT";
    }

    results.push({
      enrollmentId: enr.id,
      courseSlug: enr.course.slug,
      userId: enr.user.id,
      userRole: enr.user.role,
      matchesTestPattern: isTest ? "YES" : "NO",
      hasCompletedPayment: payment ? "YES" : "NO",
      classification
    });
  }

  console.log(`Audited ${results.length} enrollments:`);
  console.table(results);
}

run()
  .catch((err) => {
    console.error("FATAL in test-d2-unpaid-enrollments-analysis:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
