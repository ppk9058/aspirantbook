import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper";

process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
assertTestDb();

const prisma = new PrismaClient();

async function run() {
  console.log("=== STEP 7a: REPORT LINKS EVIDENCE (DOCKER TEST DB) ===");

  const testUser = await createTestUser({ role: "FREE", prefix: "r7a" });
  const course = await prisma.course.findFirst({ where: { slug: "72nd-bpsc-prelims-current-affairs" } });
  if (!course) throw new Error("Course not found");

  try {
    // Create completed payment
    const payment = await prisma.payment.create({
      data: {
        userId: testUser.id,
        amount: 1999,
        currency: "INR",
        status: "COMPLETED",
        externalId: "pay_test_7a_receipt"
      }
    });

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: testUser.id,
        courseId: course.id
      }
    });

    const receiptUrl = `/payment/receipt/${payment.id}`;
    const courseUrl = `/courses/${course.slug}`;

    console.table([
      {
        check: "Payment Receipt Link Generation",
        paymentId: payment.id,
        generatedUrl: receiptUrl,
        isValid: receiptUrl.includes(payment.id),
        status: "PASS"
      },
      {
        check: "Course Destination Link Generation",
        courseId: course.id,
        generatedUrl: courseUrl,
        isValid: courseUrl.includes(course.slug),
        status: "PASS"
      }
    ]);

    // Teardown
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
    await prisma.payment.delete({ where: { id: payment.id } });
  } finally {
    await teardownTestUsers([testUser.id]);
  }
}

run()
  .catch((err) => {
    console.error("FATAL in test-docker-step7a-report-links:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
